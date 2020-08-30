# Programma
_A light weight, simple FIFO Queue backed by PostgresSQL for delayed tasks._

## Motivation
- Long scheduling jobs in future is hard to achieve using some of the cloud providers distributed queues e.g, SQS with an upper limit of 12hour visibility timeout. For long scheduled tasks message needs to be picked up and delayed again
- Redis pub/sub model with delay time suits really well for scheduling jobs. But the problem is it is not backed by disk. It works really well for the immediate jobs where you need high throughput, but to keep jobs that has to run way in the future consumes lots of memory and it is costly
- While Redis cluster and cloud provider's distributed queues elegantly solves scaling challenges, sometimes use-case is to track these jobs in one place for simplicity, like SQL/NoSQL store without too much effort. We attempt to track job states in Postgres through Programma
- Programma goal is not to implement a solid Job Worker logic. You could use it as your end-to-end job processor for simpler low latency tasks, but we recommend to use Redis, RabbitMQ or a queue like SQS for fanning out or distributing the workload to them through Programma
- The goal of Programma is to expose a very flexible and simple API. Where client could nudge the job processing lifecycle by calling utility methods without us dictating specific lifecycle of a job

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
})

programma.processJobs({ topicName: 'sendEmail', heartBeat: 10 }, async (job: IReceiveJob) => {
  await programma.moveJobToProcessing(job.id)
})
```

## Features
- Lightweight: ~300 lines of code
- Handles schema creation for you
- Programma API is highly customizable. It's up-to you how you want to handle job life-cycle or retry logic
- Guarantee delivery of exactly to only one processor within the retry timeout period, without too much locking or effecting performance. Thanks to Postgres [**SKIP LOCK**](https://www.2ndquadrant.com/en/blog/what-is-select-skip-locked-for-in-postgresql-9-5/#:~:text=PostgreSQL%209.5%20introduces%20a%20new,and%20efficient%20concurrent%20work%20queues) feature
- Programma ensures a job is delivered and claimed by the processor with **retryAfterSeconds** logic until job status is changed. This parameter is customizable and you can use it for exponential backoff logic as well by changing the **retryAfterSeconds**
- Received messages that are not changed to either Processing, Completed or FAILED state will appear again after retryAfterSecond timeout. Default is 30seconds
- Promise based API and written in typescript

## Use with Queuing
Programma for us makes more sense to schedule task/work to be done, and to track it's progress and state or to fan-out multiple tasks to a queue system. You can parallelize Programma by running on multiple different Node processes giving maxJobs limit per heartbeat/interval where you can achieve horizontal scalability. Programma also handles schema/table creation so it could be used with a multiple PostgresDB to run the jobs. For parallelizing and doing the work you could use Redis based queue system like [**bull**](https://github.com/OptimalBits/bull) or [**rsmq**](https://github.com/smrchy/rsmq) using a shared Redis server multiple Node.js processes can send / receive messages
**Following is an example to use it with awesome bull queue**
```ts
const bullRedisQueue = new Queue('sendEmail', 'redis://127.0.0.1:6379');

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
## Use without Queuing
For tasks that does not involve heavy computation (i.e, does not block event-loop or not to put a lot of back-pressure) programma could be used as a end-to-end solution or alternatively for high latency tasks it could be used with smaller batch sizes per interval. where work could be parallelized between multiple nodes that can poll the same topic
```ts
await programma.addJob('sendPushNotification', {
  data: { token: '123213123' },
  retryAfterSeconds: 60,
  attributes: { maxAttempts: 5 },
  retryAfterSeconds: 5,
})

// you can control the re-try logic and could also use it for exponential back-off
// it's all up-to you how to handle it
programma.processJobs({ topicName: 'sendPushNotification', heartBeat: 10, maxJobs: 100 }, async (job: IReceiveJob) => {
  // check if retry attempts are exhausted
  if (job.attributes.attempts > job.attributes.maxAttempts) {
    await programma.moveJobToFailed(job.id)
  }
  try {
    await pushNotifyApi(job.data)
    await programma.moveJobToDone(job.id)
  } catch (e) {
    // set the retry counter
    await programma.setAttributes({ attempts: attempts ? attempts + 1 : 1 })
    await programma.setRetryAfterSeconds(60)
  }
})
```

## API

### Instance Creation
For the config programma uses node-postgres pool config to create an internal pool of connection. You can refer to PoolConfig interface
```ts
export interface IProgrammaConstructor {
  new (config: PoolConfig, schemaName: string): IProgramma
}

// schemaName defaults to programma. you can also give your custom schema name
const program = new Programma({
  connectionString: `postgres://<user-name>:<password>@localhost:5432/postgres`,
  max: 50, // max connection pool size. default to 10
}, 'mySchemaName')


await program.start() // this established the pool connection, ensures migration and start pooling. if start with false it won't ensure migration
```

### Programma Methods
```ts
export interface IProgramma {
  addJob(topicName: string, job: IJobConfig): Promise<string | null>
  receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback): void
  deleteJob(id: string): Promise<boolean>
  moveJobToProcessing(id: string): Promise<boolean>
  moveJobToDone(id: string, deleteOnComplete: boolean): Promise<boolean>
  moveJobToFailed(id: string, deleteOnFail: boolean): Promise<boolean>
  getJob(id: string): Promise<IJobDetail | null>
  start(): Promise<void>
  shutdown(): void
}
```

### addJob(topicName: string, job: IJobConfig): Promise<string | null>
```ts
export interface IJobConfig {
  // job data is persisted in JSONB type
  // it could contain any number of key value pairs
  data: {}

  // attributes is metadata related to job, persisted as JSONB type
  // attributes could be like retry count etc. metadata for downstream system
  // job calls will expose a method to run these attributes for downstream system
  attributes?: {}

  // run after seconds in number
  runAfterSeconds?: number

  // either Date constructor or ISO8601 format
  runAfterDate?: string | Date

  // mark job as failed after seconds
  retryAfterSeconds?: number | null
}
```

if runAfterDate or runAfterSeconds is not provided currentTime will be picked by default so job could be run in next pooling interval

### receiveJobs(config: IReceiveMessageConfig, handler: IHandlerCallback): void
```ts
export interface IReceiveMessageConfig {
  // maximum number of messages polled per hear beat interval
  // even though the handler will be executed independently per job
  maxJobs?: number

  // heart beat in seconds
  heartBeat?: number

  // name of the queue topic. this is required feild
  topicName: string
}

export interface IHandlerCallback {
  (job: IReceiveJob): void
}

export interface IReceiveJob {
  id: string
  data: Object
  attributes: Object
}
```

### getJob(id: string): Promise<IJobDetail | null>
```ts
export interface IJobDetail {
  id: string
  topicName: string
  data: Object
  attributes: Object
  state: JobStates
  start_after: string
  started_at: string | null
  created_at: string
  retry_after_seconds: number
}
```

### move to status methods
All the change status methods follows very self descriptive interface. For moveJobToDone, moveJobToFailed if a seconds boolean parameter true is passed it will delete the job from table

### SQL Jobs Table
```sql
create table if not exists ${this.schemaName}.jobs (
  id uuid primary key not null default gen_random_uuid(),
  topicName text not null,
  data jsonb,
  attributes jsonb,
  state varchar(255) not null default('created'),
  start_after timestamp with time zone not null default now(),
  started_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  retry_after_seconds int
);
```


## Meta
**Author: hadi@vincere.health**

Crated at [Vincere](https://www.vincere.health/) since we had a very similar use-case. Our initial design inspiration came from [this blog](https://www.holistics.io/blog/how-we-built-a-multi-tenant-job-queue-system-with-postgresql-ruby/)

Also we were inspired by [Pinterest Pin Later](https://github.com/pinterest/pinlater) although it's fundamentally different in implementation

We are really open to suggestions and would love to hear your feedback and job scheduling use-cases so that we can improve

