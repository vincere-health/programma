import { PoolConfig, QueryResult } from 'pg'

import { PgCommand } from './pgCommands'

import {
  parseAddJobConfig,
} from './bootstrap'

import {
  IProgramma,
  IReceiveMessageConfig,
  IHandlerCallback,
  IJobConfig,
} from './interfaces'


export class Programma implements IProgramma {
  private config: PoolConfig
  private pgCommand: PgCommand
  constructor (config: PoolConfig) {
    this.config = config
    this.pgCommand = new PgCommand(config)
  }

  public async addJob(topicName: string, job: IJobConfig): Promise<string | null> {
    try {
      const jobConfig = parseAddJobConfig(job)
      const result: QueryResult = await this.pgCommand.addJob(
        topicName, jobConfig.data, jobConfig.attributes as {}, jobConfig.runAfterDate as string, job.markFailAfterSeconds as number | null
      )
      return result.rowCount ? result.rows[0].id : null
    } catch (e) {
      console.log('see error ', e)
      return null
    }
  }

  public receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback) {
  }

  public test(name: string, limit: number): Promise<QueryResult<any>> {
    return this.pgCommand.getJobsToBeProcessed(name, limit)
  }
}