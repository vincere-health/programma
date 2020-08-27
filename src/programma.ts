import events from 'events'
import { PoolConfig, QueryResult } from 'pg'

import { Processor } from './task'
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
import { JobStates, EventStates } from './constants'


export class Programma extends events.EventEmitter implements IProgramma {
  private config: PoolConfig
  private processors: Map<string, Processor>
  private _started: boolean
  private schemaName: string

  private async moveJobToState(id: string, state: JobStates): Promise<boolean> {
    const r = await PgCommand.getInstance().changeJobState(id, state)
    return r.rowCount ? true : false
  }

  constructor (config: PoolConfig, schemaName = 'programma') {
    super()
    this.config = config
    this.processors = new Map()
    this._started = false
    this.schemaName = schemaName
  }

  private bindEventListeners(instance: events.EventEmitter) {
    instance.on(EventStates.ERROR, (e) => this.emit(EventStates.ERROR, e))
  }

  private unBindEventListener(instance: events.EventEmitter) {
    instance && instance.off(EventStates.ERROR, (e) => this.emit(EventStates.ERROR, e))
  }

  public async addJob(topicName: string, job: IJobConfig): Promise<string | null> {
    if (!this._started) return null
    try {
      const jobConfig = parseAddJobConfig(job)
      const result: QueryResult = await PgCommand.getInstance().addJob(
        topicName, jobConfig.data, jobConfig.attributes as {}, jobConfig.runAfterDate as string, job.retryAfterSeconds as number | null
      )
      return result.rowCount ? result.rows[0].id : null
    } catch (e) {
      this.emit(EventStates.ERROR, e)
      return null
    }
  }

  public receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback) {
    const processor = new Processor(config, handler)
    this.processors.set(config.topicName, processor)
    if (this._started) {
      processor.start()
      this.bindEventListeners(processor)
    }
  }

  public async deleteJob(id: string): Promise<boolean> {
    if (!this._started) return false
    const r = await PgCommand.getInstance().deleteJob(id)
    return r.rowCount ? true : false
  }

  public async moveJobToProcessing(id: string): Promise<boolean> {
    if (!this._started) return false
    return this.moveJobToState(id, JobStates.PROCESSING)
  }

  public async moveJobToDone(id: string, deleteOnComplete: boolean = false): Promise<boolean> {
    if (!this._started) return false
    if (deleteOnComplete) return this.deleteJob(id)
    return this.moveJobToState(id, JobStates.COMPLETED)
  }

  public async moveJobToFailed(id: string, deleteOnFail: boolean = false): Promise<boolean> {
    if (!this._started) return false
    if (deleteOnFail) return this.deleteJob(id)
    return this.moveJobToState(id, JobStates.FAILED)
  }

  public async start(withMigration = false) {
    PgCommand.createInstance(this.config, this.schemaName)
    this.bindEventListeners(PgCommand.getInstance())
    try {
      if (withMigration) await PgCommand.getInstance().migrate()
      for (let processor of this.processors.values()) {
        processor.start()
        this.bindEventListeners(processor)
      }
      this._started = true
    } catch (e) {
      console.log('something went wrong ', e)
      this.emit(EventStates.ERROR, e)
    }
  }

  public shutdown() {
    PgCommand.getInstance().destroyInstance()
    this.unBindEventListener(PgCommand.getInstance())
    for (let processor of this.processors.values()) {
      processor.stop()
      this.unBindEventListener(processor)
    }
    this._started = false
  }
}