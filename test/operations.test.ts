import * as chai from 'chai'
import { Programma } from '../src/'
import { dbConnectionString, testSchema } from './cfg'

const { expect } = chai

describe('adding job', () => {
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

  it('return a boolean as true when job state is changed', async () => {
    const jobId = await programma.addJob('tTopic', { data: { cool: '123' }})
    const reply = await programma.moveJobToProcessing(jobId as string)
    expect(reply).to.eq(true)
  })

  it('return a boolean as false when job state is not changed and it cannot match id', async () => {
    const reply = await programma.moveJobToProcessing('c976e059-0ff5-4d75-93e1-5938d485eb40')
    expect(reply).to.eq(false)
  })

  it('deletes a job when moveToCompleted is called with deleteOnComplete', async () => {
    const jobId = await programma.addJob('tTopic', { data: { cool: '123' }})
    expect(typeof jobId).to.eq('string')
    await programma.moveJobToDone(jobId as string, true)
    const jobDetails = await programma.getJob(jobId as string)
    expect(jobDetails).to.eq(null)
  })
})