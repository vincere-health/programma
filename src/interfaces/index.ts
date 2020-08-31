import { PoolConfig } from 'pg'
import { JobStates } from '../constants'

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

export interface IJobDetail {
  id: string
  topicName: string
  data: Object
  attributes: Object
  state: JobStates
  start_after: string
  started_at: string | null
  created_at: string
  retry_after_seconds: number
}

export interface IHandlerCallback {
  (job: IReceiveJob): void
}

export interface DbConfig extends PoolConfig {}

export interface IProgrammaConstructor {
  new (config: DbConfig, schemaName: string): IProgramma
}


export interface IProgramma {
  addJob(topicName: string, job: IJobConfig): Promise<string | null>
  receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback): void
  deleteJob(id: string): Promise<boolean>
  moveJobToProcessing(id: string): Promise<boolean>
  moveJobToDone(id: string, deleteOnComplete: boolean): Promise<boolean>
  moveJobToFailed(id: string, deleteOnFail: boolean): Promise<boolean>
  getJob(id: string): Promise<IJobDetail | null>
  start(): Promise<void>
  shutdown(): void
}

declare var IProgramma: IProgrammaConstructor