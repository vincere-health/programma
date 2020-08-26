import { Programma } from './index'


const programma = new Programma({
  host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
  user: 'vinceredevuser',
  password: 'smokingVincere',
  database: 'postgres',
  max: 50
})

function addtasks (topic = 'smsWorker') {
  console.time('enqueue')
  Promise.all(
    Array(1000).fill(0)
    .map((_, i) => (
      programma.addJob(
        topic,
        {
          data: {
            index: i,
          },
          runAfterSeconds: 20
        }
      )
    ))
  )
  .then(m => {
    console.log(m)
    console.timeEnd('enqueue')
  })
  .catch(console.error)  
}

addtasks('smsWorker')

// addtasks('anotherWorker')

// programma.addJob('sendSms', {
//   data: { something: '123' },
//   attributes: { retry: 10 },
//   runAfterSeconds: 120,
//   // runAfterDate: '2020;233232'
// })
//   .then(r => {
//     console.log('job have been added ', r)
//   })
//   .catch(console.error)

// programma.receiveJobs({ topicName: 'smsWorker' }, (id, data, attrs) => {
//   console.log('job ', id, data, attrs)
// })

programma.receiveJobs({ topicName: 'smsWorker', maxMessages: 50, heartBeat: 3 }, (job) => {
  console.log('job ', job.id, job.data, job.attributes)
})

programma.start()



// console.log(addJob('programmajobs'))


// pool.query(`
//   Select * from "programmajobs"
//   limit 20
//   for update skip locked;
// `)
//   .then(console.log)
//   .catch(console.error)

// pool.query(`
//   Select * from "programmajobs"
//   limit 20
//   for update skip locked;
// `)
//   .then(console.log)
//   .catch(console.error)
//   .finally(() => {
//     pool.end()
//   })


const s = `
CREATE TABLE "programmajobs" (
  id uuid primary key not null,
  name varchar(255) not null,
  data jsonb,
  opts jsonb,
  state  varchar(255) not null default('created'),
  start_after timestamp with time zone not null default now(),
  created_at timestamp with time zone default now(),
  mark_failed_after integer
)

`



