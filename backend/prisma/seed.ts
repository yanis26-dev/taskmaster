import { PrismaClient, TaskStatus, TaskPriority, TaskSource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user (will be overwritten on real OAuth login)
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      settings: {
        create: {
          timezone: 'America/New_York',
          digestEnabled: true,
          digestTime: '07:30',
          autoEmailToTask: true,
          autoCalendarToTask: true,
          autoTaskToCalendar: false,
        },
      },
    },
  });

  console.log(`  ✓ User: ${user.email}`);

  // Demo projects
  const workProject = await prisma.project.upsert({
    where: { id: 'proj-work-demo' },
    update: {},
    create: {
      id: 'proj-work-demo',
      userId: user.id,
      name: 'Work',
      color: '#6366f1',
    },
  });

  const personalProject = await prisma.project.upsert({
    where: { id: 'proj-personal-demo' },
    update: {},
    create: {
      id: 'proj-personal-demo',
      userId: user.id,
      name: 'Personal',
      color: '#10b981',
    },
  });

  console.log(`  ✓ Projects: Work, Personal`);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Demo tasks
  const tasks = [
    {
      title: 'Review Q1 OKRs',
      status: TaskStatus.in_progress,
      priority: TaskPriority.P1,
      dueAt: today,
      projectId: workProject.id,
      tags: ['review', 'quarterly'],
      source: TaskSource.manual,
    },
    {
      title: 'Send weekly status update',
      status: TaskStatus.next,
      priority: TaskPriority.P2,
      dueAt: today,
      projectId: workProject.id,
      tags: ['email'],
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      source: TaskSource.manual,
    },
    {
      title: 'Fix auth bug in production',
      status: TaskStatus.backlog,
      priority: TaskPriority.P0,
      projectId: workProject.id,
      tags: ['bug', 'production'],
      source: TaskSource.manual,
      estimateMinutes: 120,
    },
    {
      title: 'Schedule dentist appointment',
      status: TaskStatus.next,
      priority: TaskPriority.P3,
      dueAt: nextWeek,
      projectId: personalProject.id,
      tags: ['health'],
      source: TaskSource.manual,
    },
    {
      title: 'Read "The Pragmatic Programmer"',
      status: TaskStatus.backlog,
      priority: TaskPriority.P3,
      projectId: personalProject.id,
      tags: ['reading'],
      source: TaskSource.manual,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: { userId: user.id, ...task },
    });
  }

  console.log(`  ✓ ${tasks.length} demo tasks created`);
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
