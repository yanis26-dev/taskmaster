// Queue name constants in a separate file to avoid circular imports.
// jobs.module.ts imports these, and so do processors/scheduler —
// keeping them here breaks the circular dependency.
export const QUEUE_RECURRENCE = 'recurrence';
export const QUEUE_DIGEST = 'digest';
export const QUEUE_WEBHOOK = 'webhook';
