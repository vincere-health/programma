import * as chai from 'chai'
import * as sinon from 'sinon'
import { Programma } from '../src/'

import { IReceiveMessageConfig, IHandlerCallback } from '../src/interfaces/'
import { dbConnectionString, testSchema } from './fixtures'

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

  // after(() => {
  //   console.log('shutdown called ?')
  //   programma.shutdown()
  // })

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
})