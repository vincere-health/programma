import * as events from 'events'
import { QueryResult } from 'pg'

import { Processor } from './processor'
import { PgCommand } from './pgCommands'

import {
  parseAddJobConfig, validateReceiveJobParams
} from './bootstrap'

import {
  DbConfig,
  IProgramma,
  IReceiveMessageConfig,
  IHandlerCallback,
  IJobConfig,
  IJobDetail,
} from './interfaces'
import { JobStates, EventStates } from './constants'
import { isObject } from './bootstrap'
import { isNumber } from 'util'


export class Programma extends events.EventEmitter implements IProgramma {
  private processors: Map<string, Processor>
  private _started: boolean
  public pgCommand: PgCommand

  private async moveJobToState(id: string, state: JobStates): Promise<boolean> {
    const r = await this.pgCommand.changeJobState(id, state)
    return r.rowCount ? true : false
  }

  constructor (config: DbConfig, schemaName = 'programma') {
    super()
    this.pgCommand = new PgCommand(config, schemaName)
    this.processors = new Map()
    this._started = false
  }

  private bindEventListeners(instance: events.EventEmitter) {
    instance.on(EventStates.ERROR, (e) => this.emitState(EventStates.ERROR, e))
  }

  private unBindEventListener(instance: events.EventEmitter) {
    instance && instance.off(EventStates.ERROR, (e) => this.emit(EventStates.ERROR, e))
  }

  private emitState(state: EventStates, payload: any) : void {
    this.listeners(state).length >= 1 && this.emit(state, payload)
  }

  public async addJob(topicName: string, job: IJobConfig): Promise<string | null> {
    if (!this._started) return null
    try {
      const jobConfig = parseAddJobConfig(job)
      const result: QueryResult = await this.pgCommand.addJob(
        topicName, jobConfig.data, jobConfig.attributes as {}, jobConfig.runAfterDate as string, job.retryAfterSeconds as number | null
      )
      return result.rowCount ? result.rows[0].id : null
    } catch (e) {
      console.error(e)
      this.emitState(EventStates.ERROR, e)
      return null
    }
  }

  public receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback) {
    try {
      validateReceiveJobParams(config, handler)
      const processor = new Processor(this.pgCommand, config, handler)
      this.processors.set(config.topicName, processor)
      if (this._started) {
        processor.start()
        this.bindEventListeners(processor)
      }
    } catch (e) {
      console.error(e)
      this.emitState(EventStates.ERROR, e)
    }
  }

  public async setAttributes(id: string, attributes: object): Promise<boolean> {
    if (!this._started || !isObject(attributes)) return false
    const r = await this.pgCommand.setAttributes(id, attributes)
    return r.rowCount ? true : false
  }

  public async setRetryAfterSeconds(id: string, seconds: number): Promise<boolean> {
    if (!this._started || !isNumber(seconds) || seconds < 1) return false
    const r = await this.pgCommand.setRetryAfterSeconds(id, seconds)
    return r.rowCount ? true : false
  }

  public async setJobStartDate(id: string, startDate: string | Date): Promise<boolean> {
    if (!this._started) return false
    const r = await this.pgCommand.setJobStartTime(id, startDate)
    return r.rowCount ? true : false
  }

  public async deleteJob(id: string): Promise<boolean> {
    if (!this._started) return false
    const r = await this.pgCommand.deleteJob(id)
    return r.rowCount ? true : false
  }

  public async moveJobToProcessing(id: string): Promise<boolean> {
    if (!this._started) return false
    return this.moveJobToState(id, JobStates.PROCESSING)
  }

  public async moveJobToDone(id: string, deleteOnComplete: boolean = false): Promise<boolean> {
    if (deleteOnComplete) return this.deleteJob(id)
    return this.moveJobToState(id, JobStates.COMPLETED)
  }

  public async moveJobToFailed(id: string, deleteOnFail: boolean = false): Promise<boolean> {
    if (deleteOnFail) return this.deleteJob(id)
    return this.moveJobToState(id, JobStates.FAILED)
  }

  public async getJob(id: string): Promise<IJobDetail | null> {
    if (!this._started) return null
    try {
      const job = await this.pgCommand.getJobDetails(id)
      return job.rowCount ? job.rows[0] as IJobDetail : null
    } catch (e) {
      console.error(e)
      this.emitState(EventStates.ERROR, e)
      return null
    }
  }

  public async start(withMigration = true) {
    this.pgCommand.start()
    this.bindEventListeners(this.pgCommand)
    try {
      withMigration ? await this.pgCommand.migrate() : await this.pgCommand.ping()
      for (let processor of this.processors.values()) {
        processor.start()
        this.bindEventListeners(processor)
      }
      this._started = true
    } catch (e) {
      console.error(e)
      this.emitState(EventStates.ERROR, e)
    }
  }

  public shutdown() {
    this.pgCommand.stop()
    this.unBindEventListener(this.pgCommand)
    for (let processor of this.processors.values()) {
      processor.stop()
      this.unBindEventListener(processor)
    }
    this._started = false
  }
}