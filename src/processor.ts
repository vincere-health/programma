import { EventEmitter } from 'events'
import { PgCommand } from './pgCommands'
import {
  IReceiveMessageConfig,
  IHandlerCallback,
  IReceiveJob,
} from './interfaces'
import { EventStates } from './constants'

import { isNumber } from './bootstrap'

export class Processor extends EventEmitter {
  private heartBeat: number
  private maxJobs: number
  private topic: string
  readonly handler: IHandlerCallback
  private isRunning: boolean
  private _timeout: any
  private pgCommand: PgCommand
  constructor (pgCommand: PgCommand, config: IReceiveMessageConfig, handler: IHandlerCallback) {
    super()
    this.pgCommand = pgCommand
    this.heartBeat = isNumber(config.heartBeat) ? config.heartBeat as number : 5
    this.maxJobs = isNumber(config.maxJobs) ? config.maxJobs as number : 100
    this.topic = config.topicName
    this.handler = handler
    this.isRunning = false
    this._timeout = null
  }

  private poll() {
    this._timeout = setTimeout(async () => {
      if (!this.isRunning) return
      try {
        const jobs = await this.pgCommand.getJobsToBeProcessed(
          this.topic,
          this.maxJobs
        )
        // console.log(jobs)
        jobs.rows.map(r => this.handler({
          id: r.id,
          data: r.data,
          attributes: r.attributes || {},
        } as IReceiveJob))
      } catch (e) {
        console.error(e)
        this.emit(EventStates.ERROR, e)
      }
      this.poll()
    }, this.heartBeat * 1000)
  }

  public start() {
    this.isRunning = true
    this.poll()
  }

  public stop() {
    this._timeout && clearTimeout(this._timeout)
    this.isRunning = false
  }
}