import { dropSchema } from './utils'

after(async () => {
  console.log('teardown is called')
  await dropSchema()
})