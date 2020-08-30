import { dropSchema } from './utils'

after(async () => {
  await dropSchema()
})