export interface IRunOpts {
  // run after seconds in number
  runAfterSeconds?: number

  // either Date constructor or ISO8601 format
  runAfterDate?: string | Date

  // mark job as failed after seconds
  retryAfterSeconds?: number | null
}

export interface IReceiveMessageConfig {
  // maximum number of messages polled per hear beat interval
  // even though the handler will be executed independently per job
  maxJobs?: number

  // heart beat in seconds
  heartBeat?: number

  // name of the queue topic
  topicName: string
}

export interface IReceiveJob {
  id: string
  data: Object
  attributes: Object
}

export interface IJobConfig extends IRunOpts {
  // job data is persisted in JSONB type
  // it could contain any number of key value pairs
  data: {}

  // attributes is metadata related to job
  // attributes could be like retry count etc. metadata for downstream system
  // job calls will expose a method to run these attributes for downstream system
  attributes?: {}
}

export interface IProgramma {
  addJob(topicName: string, job: IJobConfig): Promise<string | null>
  receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback): void
  deleteJob(id: string): Promise<boolean>
  moveJobToProcessing(id: string): Promise<boolean>
  moveJobToDone(id: string, deleteOnComplete: boolean): Promise<boolean>
  moveJobToFailed(id: string, deleteOnFail: boolean): Promise<boolean>
  start(): Promise<void>
  shutdown(): void
}

export interface IHandlerCallback {
  (job: IReceiveJob): void
}