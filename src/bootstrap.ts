import invariant from 'invariant'
import { IJobConfig } from './interfaces'
import { copyFile } from 'fs'

const exists = (a: any) => typeof a !== 'undefined'
const isNumber = (a: any) => typeof a === 'number'
const isString = (a: any) => typeof a === 'string'
const isArray = (a: any) => Array.isArray(a)
const isObject = (a: any) => typeof a === 'object' && !isArray(a)

export const parseAddJobConfig = (config: IJobConfig): IJobConfig => {
  invariant(
    isObject(config.data),
    `programma: data is required as object. follow IJobConfig interface for adding job`
  )

  config.attributes = isObject(config.attributes) ? config.attributes : {}
  // runAfter date takes precedence
  if (isString(config.runAfterDate)) {
    config.runAfterDate = new Date(config.runAfterDate as Date | string).toISOString()
  } else if (isNumber(config.runAfterSeconds)) {
    const currDate = new Date()
    const afterSeconds = config.runAfterSeconds as number
    currDate.setSeconds(currDate.getSeconds() + afterSeconds)
    config.runAfterDate = currDate.toISOString()
  } else {
    config.runAfterDate = new Date().toISOString()
  }

  config.retryAfterSeconds = isNumber(config.retryAfterSeconds) ? config.retryAfterSeconds : 30
  return config
}

export const parsePoolConfig = () => {
}