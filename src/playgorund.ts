// import { Programma } from './index'


// const programma1 = new Programma({
//   host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
//   user: 'vinceredevuser',
//   password: 'smokingVincere',
//   database: 'postgres',
//   max: 50
// })

// const programma2 = new Programma({
//   host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
//   user: 'vinceredevuser',
//   password: 'smokingVincere',
//   database: 'postgres',
//   max: 50
// })

// function addtasks (topic: string) {
//   console.time('enqueue')
//   Promise.all(
//     Array(10).fill(0)
//     .map((_, i) => (
//       programma1.addJob(
//         topic,
//         {
//           data: {
//             index: i,
//           },
//           attributes: {
//             maxRetries: 10,
//           },
//           runAfterDate: '2020-08-27T10:40:19Z',
//           retryAfterSeconds: 30,
//         }
//       )
//     ))
//   )
//   .then(m => {
//     console.log(m)
//     console.timeEnd('enqueue')
//   })
//   .catch(console.error)  
// }

// programma1.start(true).then(() => {
//   addtasks('smsWorker')
// })

// programma2.start(true).then(() => {
//   // addtasks('smsWorker')
// })



// // addtasks('anotherWorker')


// programma1.receiveJobs({ topicName: 'smsWorker', maxJobs: 5, heartBeat: 1 }, async (job) => {
//   console.log('worker 1 ', job.id, job.data, job.attributes)
//   await programma1.moveJobToProcessing(job.id)
// })

// programma2.receiveJobs({ topicName: 'smsWorker', maxJobs: 5, heartBeat: 1 }, async (job) => {
//   console.log('worker 2 ', job.id, job.data, job.attributes)
//   await programma2.moveJobToProcessing(job.id)
// })

// // setTimeout(() => {
// //   console.log('calling shutdown')
// //   programma1.shutdown()

// //   setTimeout(() => {
// //     console.log('statring again')
// //     programma1.start()
// //   }, 5000)
// // }, 40 * 1000)


// // console.log(addJob('programmajobs'))


// // pool.query(`
// //   Select * from "programmajobs"
// //   limit 20
// //   for update skip locked;
// // `)
// //   .then(console.log)
// //   .catch(console.error)

// // pool.query(`
// //   Select * from "programmajobs"
// //   limit 20
// //   for update skip locked;
// // `)
// //   .then(console.log)
// //   .catch(console.error)
// //   .finally(() => {
// //     pool.end()
// //   })


// const s = `
// CREATE TABLE "programmajobs" (
//   id uuid primary key not null,
//   name varchar(255) not null,
//   data jsonb,
//   attributes jsonb,
//   state  varchar(255) not null default('created'),
//   start_after timestamp with time zone not null default now(),
//   started_at timestamp with time zone,
//   created_at timestamp with time zone default now(),
//   retry_after_seconds integer
// );
// `



