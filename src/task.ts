import { PgCommand } from './pgCommands'
import {
  IReceiveMessageConfig,
  IHandlerCallback,
  IReceiveJob,
} from './interfaces'

export class Task {
  private heartBeat: number
  private maxMessages: number
  private topic: string
  readonly handler: IHandlerCallback
  private isRunning: boolean
  private _timeout: any
  constructor (config: IReceiveMessageConfig, handler: IHandlerCallback) {
    this.heartBeat = config.heartBeat || 5
    this.maxMessages = config.maxMessages || 100
    this.topic = config.topicName
    this.handler = handler
    this.isRunning = false
    this._timeout = null
  }

  private poll() {
    this._timeout = setTimeout(async () => {
      console.log('running loop')
      try {
        const jobs = await PgCommand.getInstance().getJobsToBeProcessed(
          this.topic,
          this.maxMessages
        )
        // console.log(jobs)
        jobs.rows.map(r => this.handler({
          id: r.id,
          data: r.data,
          attributes: r.opts || {},
        } as IReceiveJob))
      } catch (e) {
        console.log('something went wrong while polling')
      }
      this.isRunning && this.poll()
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