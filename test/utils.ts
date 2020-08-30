import { Programma } from '../src'
import { testSchema, dbConnectionString } from './cfg'

export const dropSchema = async () => {
  const programma = new Programma({
    connectionString: dbConnectionString
  }, testSchema)
  await programma.start()
  await programma?.pgCommand?.pool?.query(
    `DROP SCHEMA IF Exists ${testSchema} CASCADE`
  )
  programma.shutdown()
}

export const setTimeoutPromise = (timeout: number) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};