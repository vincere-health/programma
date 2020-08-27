# Programma
_A light weight, simple FIFO Queue backed by PostgresSQL._

## Motivation
- Long scheduling jobs in future is hard using some of the cloud providers distributed queues e.g, SQS with limitation on visibility timeouts
- Redis pub/sub model with delay time suits really well for scheduling jobs. But the problem is it is not persistent and not backed by disk. We ran into issues with our Redis primary going down in AWS ElasticCache and some of our transient jobs were lost due to slight replication delay with very hard point of recovery
- While Redis cluster and cloud provider's distributed queues elegantly solves scaling challenges, sometimes use-case is to track these jobs in some place, like SQL/NoSQL store without too much effort. We attempt to track job states in Postgres through Programma
- Programma goal is not to implement job fan-out or a solid Job Worker logic. You could use it as your end-to-end job processor for simpler low latency tasks, but we recommend to use Redis, RabbitMQ or a queue like SQS for fanning out or distributing the workload

## Quickstart

```bash
npm install programma
```


```ts
import { Programma } from 'programma'

const programma = new Programma({
  connectionString: '<database-connection-string>',
})

// connect to node-pq pool and start processing
await programma.start()

await programma.addJob('sendEmail', {
  data: { email: 'xyz@gmail.com'},
  runAfterDate: '2020-08-27T20:02:18.255Z', // optional UTC ISO-8601 format, run after a specific date takes precedence
  runAfterSeconds: 180, // optional
  // if nothing is provided job will be run after current time or at once
})

programma.processJobs({ topicName: 'sendEmail', heartBeat: 10 }, async (job: IReceiveJob) => {
  await programma.moveJobToProcessing(job.id)
})
```

## Features
- Lightweight: ~300 lines of code
- Handles schema creation for you if the Programma process is started with migrationFlag true it ensures the migration
- Programma API is highly customizable. It's up-to you how to create a job life-cycle or retry logic
- Guarantee delivery of exactly to only one processor within the retry timeout period, without too much locking or effecting performance. Thanks to Postgres SKIP LOCK
- Programma ensures a job is delivered and claimed by the processor with **retryAfterSeconds** logic until job status is changed. This parameter is customizable and you can use it for exponential backoff logic as well by changing the **retryAfterSeconds**
- Received messages that are not changed to either Processing, Completed or FAILED state will appear again after retryAfterSecond timeout
- Promised base API, written in typescript and TypeScript Typings

## Use with Queuing
Programma for us makes more sense to schedule task/work to be done and to track it's progress and state, not to fan-out or do the actual work. You can parallelize Programma by running on multiple different node processes giving maxJobs limit per heartbeat/interval where you can achieve horizontal scalability. Programma also handles schema/table creation so it could be used with a multiple PostgresDB to run the jobs. For parallelizing and doing the work you could use Redis based queue system like [**bull**](https://github.com/OptimalBits/bull) or [**rsmq**](https://github.com/smrchy/rsmq) using a shared Redis server multiple Node.js processes can send / receive messages
**Following is an example to use it with awesome bull queue**
```ts
var bullRedisQueue = new Queue('sendEmail', 'redis://127.0.0.1:6379');

await programma.addJob('sendEmail', {
  data: { email: 'xyz@gmail.com'},
  runAfterDate: '2020-08-27T20:02:18.255Z', // optional UTC ISO-8601 format, run after a specific date takes precedence
  retryAfterSeconds: 60,
})

programma.processJobs({ topicName: 'sendEmail', heartBeat: 10 }, async (job: IReceiveJob) => {
  // use all the good things provided by bull to retry the work to be done and everything
  await bullRedisQueue.add(
    { id: job.id, data: job.data, attributes: job.data },
    { retries: 3, backoff: 20000,timeout: 15000 }
  )
  // move job to processing, after submitting it. the status will be changed to processing and Redis queue will handle it
  // if a job is not moved to different state it will be retired after retryAfterSecond period
  await programma.moveJobToProcessing(job.id)
})

bullRedisQueue.process(async (job, done) => {
  // heavy processing
  await programma.moveJobToDone(jod.data.id)
  return Promise.resolve()
})

// job failed after all the back-off retries
// we can track that in SQL
bullRedisQueue.on('failed', (id, error) => {
  const job = await bullRedisQueue.getJob(id)
  await programma.moveJobToFailed(jod.data.id)
  // also can track error in SQL
  await programma.addToAttributes('error', error)
})

```

## API
TBA


## Concepts

