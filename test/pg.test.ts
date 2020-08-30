import * as chai from 'chai'
import * as sinon from 'sinon'
import { Programma } from '../src/'
import { dbConnectionString, dbConnectionObject, testSchema } from './cfg'

const { expect } = chai

describe('database connectivity/config', () => {
  it('should emit error on wrong database config', async () => {
    const programma = new Programma({
      connectionString: `postgres://wrong:@wrong:5432/postgres`
    }, testSchema)
    const spy = sinon.spy()
    programma.on('error', spy)
    await programma.start()
    expect(spy.called).eq(true)
  })

  it('should emit error even when started with migration flag as false', async () => {
    const programma = new Programma({
      connectionString: `postgres://wrong:@wrong:5432/postgres`
    }, testSchema)
    const spy = sinon.spy()
    programma.on('error', spy)
    await programma.start(false)
    expect(spy.called).eq(true)
  })

  it('does not emit any error if the config is accurate', async () => {
    const programma = new Programma({
      connectionString: dbConnectionString
    }, testSchema)
    const spy = sinon.spy()
    programma.on('error', spy)
    await programma.start()
    programma.shutdown()
    expect(spy.called).eq(false)
  })

  it('does not throw any error when connected with valid object based config', async () => {
    const programma = new Programma(dbConnectionObject, testSchema)
    const spy = sinon.spy()
    programma.on('error', spy)
    await programma.start()
    programma.shutdown()
    expect(spy.called).eq(false)
  })
})
