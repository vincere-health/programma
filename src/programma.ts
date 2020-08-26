import { PoolConfig, QueryResult } from 'pg'

import { Task } from './task'
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
  private tasks: Map<string, Task>
  constructor (config: PoolConfig) {
    this.config = config
    this.tasks = new Map()
    PgCommand.createInstance(this.config)
  }

  public async addJob(topicName: string, job: IJobConfig): Promise<string | null> {
    try {
      const jobConfig = parseAddJobConfig(job)
      const result: QueryResult = await PgCommand.getInstance().addJob(
        topicName, jobConfig.data, jobConfig.attributes as {}, jobConfig.runAfterDate as string, job.markFailAfterSeconds as number | null
      )
      return result.rowCount ? result.rows[0].id : null
    } catch (e) {
      console.log('see error ', e)
      return null
    }
  }

  public receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback) {
    const task = new Task(config, handler)
    this.tasks.set(config.topicName, task)
  }

  public moveJobToDone() {}
  public moveJobToProcessing() {}
  public moveJobToFailed() {}

  public start() {
    for (let task of this.tasks.values()) {
      task.start()
    }
  }

  public shutdown() {
    PgCommand.getInstance().shutdown()
    for (let task of this.tasks.values()) {
      task.stop()
    }
  }
}