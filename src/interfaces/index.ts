export interface IRunOpts {
  // run after seconds in number
  runAfterSeconds?: number

  // either Date constructor or ISO8601 format
  runAfterDate?: string | Date

  // mark job as failed after seconds
  markFailAfterSeconds?: number | null
}

export interface IReceiveMessageConfig {
  // max batch of messages will be received
  maxMessages?: number

  // heart beat in seconds
  heartBeat?: number

  // name of the queue topic
  topicName: string
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
  // enqueue will return jobId
  addJob(topicName: string, job: IJobConfig): Promise<string | null>

  // batch size will be configured here
  receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback): void
}

export interface IHandlerCallback {
  (next: Function): void
}