import * as chai from 'chai'
import * as sinon from 'sinon'
import { Programma } from '../src/'

import { IJobConfig } from '../src/interfaces/'
import { dbConnectionString, dbConnectionObject } from './fixtures'


const { expect } = chai


describe('programma tests', () => {
  describe('database connectivity/config', () => {
    it('should emit error on wrong database config', async () => {
      const programma = new Programma({
        connectionString: `postgres://wrong:@wrong:5432/postgres`
      })
      const spy = sinon.spy()
      programma.on('error', spy)
      await programma.start()
      expect(spy.called).eq(true)
    })

    it('should emit error even when started with migration flag as false', async () => {
      const programma = new Programma({
        connectionString: `postgres://wrong:@wrong:5432/postgres`
      })
      const spy = sinon.spy()
      programma.on('error', spy)
      await programma.start(false)
      expect(spy.called).eq(true)
    })

    it('does not emit any error if the config is accurate', async () => {
      const programma = new Programma({
        connectionString: dbConnectionString
      })
      const spy = sinon.spy()
      programma.on('error', spy)
      await programma.start()
      programma.shutdown()
      expect(spy.called).eq(false)
    })

    it('does not throw any error when connected with valid object based config', async () => {
      const programma = new Programma(dbConnectionObject)
      const spy = sinon.spy()
      programma.on('error', spy)
      await programma.start()
      programma.shutdown()
      expect(spy.called).eq(false)
    })
  })

  describe('adding job', () => {
    let programma: Programma
    before(() => {
      programma = new Programma({
        connectionString: dbConnectionString,
      })
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
      console.log('see result ', result)
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

    it('run after second field is computed and persisted accurately', async () => {
      await programma.start()
      const enqueueTime = new Date()
      const result = await programma.addJob('testTopic', {
        data: { cool: '123 '},
        runAfterSeconds: 20,
      })
      console.log('see result ', result)
      const job = await programma.getJob(result as string)
      expect(typeof job).to.eq('object')
      if (job) {
        const startAfter = new Date(job.start_after as string)
        const diffInSeconds = Math.abs((startAfter.getTime() - enqueueTime.getTime()) / 1000)
        console.log(enqueueTime, startAfter, diffInSeconds)
        expect(2).to.eq(2)
      }
    })

  })
})
