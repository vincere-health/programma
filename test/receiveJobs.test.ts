import * as chai from 'chai'
import * as sinon from 'sinon'
import { Programma } from '../src/'

import { IReceiveMessageConfig, IHandlerCallback } from '../src'
import { dbConnectionString, testSchema } from './cfg'
import { JobStates } from '../src/constants'

import { setTimeoutPromise } from './utils'
const { expect } = chai

describe('receive jobs', () => {
  let programma: Programma
  beforeEach(async () => {
    programma = new Programma({
      connectionString: dbConnectionString,
    }, testSchema)
    await programma.start()
  })

  afterEach(() => {
    programma.shutdown()
  })

  it('should emit error if topicName is not provided', async () => {
    const spy = sinon.spy()
    programma.on('error', spy)
    programma.receiveJobs({} as IReceiveMessageConfig, () => {})
    expect(spy.called).eq(true)
  })

  it('should emit error if handler function is not provided', async () => {
    const spy = sinon.spy()
    programma.on('error', spy)
    programma.receiveJobs({ topicName: 'test' }, {} as IHandlerCallback)
    expect(spy.called).eq(true)
  })

  it('should call the the handler in specified period', async () => {
    await programma.addJob('specificTopic', {
      data: { cool: '123 '}
    })
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'specificTopic', heartBeat: 1 }, spy)
    await setTimeoutPromise(1050)
    expect(spy.called).eq(true)
  })

  it('it calls handler for every job individually', async () => {
    await Promise.all(
      Array(3).fill(3).map(() => programma.addJob('multiTopic', {
        data: { cool: '123 '}
      }))
    )
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'multiTopic', heartBeat: 1 }, spy)
    await setTimeoutPromise(1050)
    expect(spy.calledThrice).eq(true)
  })

  it('it respects the maxJob limit', async () => {
    await Promise.all(
      Array(3).fill(3).map(() => programma.addJob('maxJob', {
        data: { cool: '123 '}
      }))
    )
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'maxJob', maxJobs: 2, heartBeat: 1 }, spy)
    await setTimeoutPromise(1050)
    expect(spy.calledTwice).eq(true)
  })

  it('job should become active when run after seconds are given', async () => {
    const jobId = await programma.addJob('afterSeconds', {
      data: { cool: '123 '},
      runAfterSeconds: 5,
    })
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'afterSeconds', heartBeat: 1 }, spy)
    await setTimeoutPromise(6000)
    expect(spy.calledOnce).eq(true)
    const jobDetails = await programma.getJob(jobId as string)
    expect(jobDetails?.state).to.eq(JobStates.ACTIVE)
  }).timeout(6200)

  it('job should become active when run after date is given as string is given are given', async () => {
    const date = new Date()
    date.setSeconds(date.getSeconds() + 5)
    const jobId = await programma.addJob('runAfterTime', {
      data: { cool: '123 '},
      runAfterDate: date.toISOString(),
    })
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'runAfterTime', heartBeat: 1 }, spy)
    await setTimeoutPromise(5100)
    expect(spy.calledOnce).eq(true)
    const jobDetails = await programma.getJob(jobId as string)
    expect(jobDetails?.state).to.eq(JobStates.ACTIVE)
  }).timeout(6000)

  it('job is retried after the given retry interval if the state of job is not changed', async () => {
    await programma.addJob('retryAfterSeconds', {
      data: { cool: '123 '},
      retryAfterSeconds: 2,
    })
    const spy = sinon.spy()
    programma.receiveJobs({ topicName: 'retryAfterSeconds', heartBeat: 1 }, spy)
    await setTimeoutPromise(3200)
    expect(spy.calledTwice).eq(true)
  }).timeout(3500)
})