import * as chai from 'chai'
import * as sinon from 'sinon'
import { Programma } from '../src/'

import { IJobConfig } from '../src/interfaces/'
import {
  RETRY_AFTER_SECONDS
} from '../src/constants'
import { dbConnectionString, testSchema } from './fixtures'

const { expect } = chai

describe('adding job', () => {
  let programma: Programma
  before(() => {
    programma = new Programma({
      connectionString: dbConnectionString,
    }, testSchema)
  })

  afterEach(() => {
    programma.shutdown()
  })

  it('adding job should return null if programma is not started yet', async () => {
    const result = await programma.addJob('testTopic', { data: { cool: '123' }})
    expect(result).to.eq(null)
  })

  it('adding job should return string based id if programma is started', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', { data: { cool: '123' }})
    expect(typeof result).to.eq('string')
  })

  it('should return null if data as object is not provided and also emits an error of wrong job config', async () => {
    await programma.start()
    const spy = sinon.spy()
    programma.on('error', spy)
    const result = await programma.addJob('testTopic', {} as IJobConfig)
    expect(result).to.eq(null)
    expect(spy.called).eq(true)
  })

  it('run after seconds field is computed and persisted accurately', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
      runAfterSeconds: 20,
    })
    const enqueueTime = new Date()
    const job = await programma.getJob(result as string)
    const startAfterDate = new Date(job ? job.start_after : Date())
    const diffInSeconds = Math.round((startAfterDate.getTime() - enqueueTime.getTime()) / 1000)
    expect(diffInSeconds).to.eq(20)
  })

  it('runAfterDate takes precedence and persisted accurately', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
      runAfterSeconds: 20,
      runAfterDate: '2020-08-30T06:41:26.536Z'
    })
    const job = await programma.getJob(result as string)
    const startAfter = new Date(job ? job.start_after : new Date()).toISOString()
    expect(startAfter).to.eq('2020-08-30T06:41:26.536Z')
  })

  it('current date is picked if no runAfter args are provided', async () => {
    await programma.start()
    const enqueueTime = new Date().toISOString()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
    })
    const job = await programma.getJob(result as string)
    const startAfter = new Date(job ? job.start_after : new Date()).toISOString()
    expect(startAfter).to.eq(enqueueTime)
  })

  it('retry after seconds is set to default', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
    })
    const job = await programma.getJob(result as string)
    expect(job?.retry_after_seconds).to.eq(RETRY_AFTER_SECONDS)
  })

  it('retry after seconds has to be greater or equal to ', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
    })
    const job = await programma.getJob(result as string)
    expect(job?.retry_after_seconds).to.eq(RETRY_AFTER_SECONDS)
  })

  it('retry after seconds is persisted correctly when given as a number', async () => {
    await programma.start()
    const result = await programma.addJob('testTopic', {
      data: { cool: '123 '},
      retryAfterSeconds: 10,
    })
    const job = await programma.getJob(result as string)
    expect(job?.retry_after_seconds).to.eq(10)
  })

  it('attributes are persisted correctly when given as object', async () => {
    await programma.start()
    const attributes = {
      a: 'cool',
      b: 3,
    }
    const result = await programma.addJob('testTopic', {
      data: { cool: '123' },
      attributes,
    })
    const job = await programma.getJob(result as string)
    expect(job?.attributes).to.deep.equal(attributes)
  })
})