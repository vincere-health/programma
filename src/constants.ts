export enum JobStates {
  CREATED = 'created',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

export const RETRY_AFTER_SECONDS = 30


export enum EventStates {
  ERROR = 'error',
}