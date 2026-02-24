import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Integration tests for Task CRUD endpoints.
 * Requires a running Postgres + Redis instance (see docker-compose.yml).
 * Run with: npm run test:e2e
 */
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let testUserId: string;
  let accessToken: string;
  let createdTaskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@e2e.example.com' },
      update: {},
      create: {
        email: 'test@e2e.example.com',
        name: 'E2E Test User',
        settings: { create: {} },
      },
    });
    testUserId = testUser.id;

    // Issue JWT token
    accessToken = jwtService.sign({ sub: testUserId, email: testUser.email, name: testUser.name });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await app.close();
  });

  describe('POST /api/tasks', () => {
    it('creates a task with minimal fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Test Task' })
        .expect(201);

      expect(res.body.title).toBe('E2E Test Task');
      expect(res.body.status).toBe('backlog');
      expect(res.body.priority).toBe('P2');
      expect(res.body.source).toBe('manual');
      expect(res.body.userId).toBe(testUserId);
      createdTaskId = res.body.id;
    });

    it('creates a task with all fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Full Task',
          notes: '# Notes\n\nMarkdown supported',
          status: 'next',
          priority: 'P1',
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test', 'e2e'],
          estimateMinutes: 60,
          recurrenceRule: 'FREQ=WEEKLY',
        })
        .expect(201);

      expect(res.body.title).toBe('Full Task');
      expect(res.body.priority).toBe('P1');
      expect(res.body.tags).toEqual(['test', 'e2e']);
      expect(res.body.estimateMinutes).toBe(60);
      expect(res.body.recurrenceRule).toBe('FREQ=WEEKLY');
    });

    it('rejects task without title (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ priority: 'P1' })
        .expect(400);
    });

    it('rejects request without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/tasks')
        .send({ title: 'No auth' })
        .expect(401);
    });
  });

  describe('GET /api/tasks', () => {
    it('returns tasks for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((t: any) => t.userId === testUserId)).toBe(true);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks?status=next')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.every((t: any) => t.status === 'next')).toBe(true);
    });

    it('searches by title', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks?q=E2E+Test+Task')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.some((t: any) => t.title === 'E2E Test Task')).toBe(true);
    });
  });

  describe('GET /api/tasks/today', () => {
    it('returns today tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates task title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title', priority: 'P0' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('P0');
    });
  });

  describe('POST /api/tasks/:id/transition', () => {
    it('transitions task to done', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tasks/${createdTaskId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'done' })
        .expect(200);

      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeTruthy();
    });

    it('transitions task back to next', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tasks/${createdTaskId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'next' })
        .expect(200);

      expect(res.body.status).toBe('next');
      expect(res.body.completedAt).toBeNull();
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('returns 404 for deleted task', async () => {
      await request(app.getHttpServer())
        .get(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
