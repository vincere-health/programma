import * as invariant from 'invariant'
import { IJobConfig, IReceiveMessageConfig, IHandlerCallback } from './interfaces'
import { RETRY_AFTER_SECONDS } from './constants'

export const exists = (a: any) => typeof a !== 'undefined' && a !== null
export const isNumber = (a: any) => typeof a === 'number'
export const isString = (a: any) => typeof a === 'string'
export const isArray = (a: any) => Array.isArray(a)
export const isObject = (a: any) => exists(a) && typeof a === 'object' && !isArray(a)

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

  config.retryAfterSeconds = isNumber(config.retryAfterSeconds)
    ? config.retryAfterSeconds
    : RETRY_AFTER_SECONDS
  return config
}

export const validateReceiveJobParams = (config: IReceiveMessageConfig | undefined, handler: IHandlerCallback | undefined) => {
  invariant(
    isObject(config) && isString(config?.topicName),
    `programma: receive job config is required as an object with topicName. refer to interface IReceiveMessageConfig`
  )

  invariant(
    exists(handler) && (typeof handler === 'function'),
    `programma: a callback function is required as seconds arg. refer to IHandlerCallback function`
  )
}