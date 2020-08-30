export enum JobStates {
  CREATED = 'created',
  ACTIVE = 'active',
  READY = 'ready',
  PROCESSING = 'processing',
  FAILED = 'failed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const RETRY_AFTER_SECONDS = 30


export enum EventStates {
  ERROR = 'error',
}