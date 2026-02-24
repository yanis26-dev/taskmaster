import { RecurrenceService } from './recurrence.service';
import { PrismaService } from '../common/prisma/prisma.service';

// ── Unit tests for RecurrenceService ─────────────────────────────────────────
// Tests the RRULE parsing + next-occurrence computation without DB.

describe('RecurrenceService', () => {
  let service: RecurrenceService;

  beforeEach(() => {
    // Minimal mock — we only test computeNextOccurrence (no DB calls)
    const mockPrisma = {} as PrismaService;
    service = new RecurrenceService(mockPrisma);
  });

  describe('computeNextOccurrence', () => {
    it('computes next daily occurrence', () => {
      const after = new Date('2024-03-15T10:00:00Z');
      const next = service.computeNextOccurrence('FREQ=DAILY', after);
      expect(next).not.toBeNull();
      expect(next!.getTime()).toBeGreaterThan(after.getTime());
      // Should be exactly one day later
      const diffDays = (next!.getTime() - after.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(1, 0);
    });

    it('computes next weekly occurrence', () => {
      const after = new Date('2024-03-15T10:00:00Z'); // Friday
      const next = service.computeNextOccurrence('FREQ=WEEKLY', after);
      expect(next).not.toBeNull();
      const diffDays = (next!.getTime() - after.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('computes weekdays only (MO-FR)', () => {
      // Saturday 2024-03-16
      const after = new Date('2024-03-15T23:00:00Z'); // Fri evening
      const next = service.computeNextOccurrence(
        'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        after,
      );
      expect(next).not.toBeNull();
      const dayOfWeek = next!.getUTCDay(); // 0=Sun, 6=Sat
      expect(dayOfWeek).toBeGreaterThanOrEqual(1);
      expect(dayOfWeek).toBeLessThanOrEqual(5);
    });

    it('computes monthly occurrence', () => {
      const after = new Date('2024-03-15T10:00:00Z');
      const next = service.computeNextOccurrence('FREQ=MONTHLY', after);
      expect(next).not.toBeNull();
      // Should land in April
      expect(next!.getUTCMonth()).toBe(3); // April = 3
    });

    it('handles RRULE: prefix gracefully', () => {
      const after = new Date('2024-03-15T10:00:00Z');
      const next = service.computeNextOccurrence('RRULE:FREQ=DAILY', after);
      expect(next).not.toBeNull();
    });

    it('returns null for invalid RRULE', () => {
      const after = new Date();
      const next = service.computeNextOccurrence('NOT_A_VALID_RULE', after);
      expect(next).toBeNull();
    });

    it('handles biweekly correctly', () => {
      const after = new Date('2024-03-15T10:00:00Z');
      const next = service.computeNextOccurrence('FREQ=WEEKLY;INTERVAL=2', after);
      expect(next).not.toBeNull();
      const diffDays = (next!.getTime() - after.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(14, 0);
    });
  });
});
