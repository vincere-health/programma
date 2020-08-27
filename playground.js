const { Programma } = require('./dist')


const programma1 = new Programma({
  host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
  user: 'vinceredevuser',
  password: 'smokingVincere',
  database: 'postgres',
  max: 50,
}, 'jobsSchema')


programma1.addJob('sendSms', {
  runAfterDate
})

programma1.moveJobToProcessing
// programma1.on('error', e => {
//   console.log('program1 error ', e)
// })

// const programma2 = new Programma({
//   host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
//   user: 'vinceredevuser',
//   password: 'smokingVincere',
//   database: 'postgres',
//   max: 50
// }, 'jobsSchema')

// programma1.on('error', e => {
//   console.log('program2 error ', e)
// })

function addtasks (instance, topic) {
  console.time('enqueue')
  Promise.all(
    Array(20).fill(0)
    .map((_, i) => (
      instance.addJob(
        topic,
        {
          data: {
            index: i,
          },
          attributes: {
            maxRetries: 10,
          },
          runAfterDate: '2020-08-27T10:40:19Z',
          retryAfterSeconds: 30,
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

programma1.start(true).then(() => {
  addtasks(programma1, 'smsWorker')
})

// programma2.start(true).then(() => {
//   addtasks(programma2, 'smsWorker')
// })

programma1.receiveJobs({ topicName: '132132' }, async (job) => {
  console.log('worker 1 ', job.id, job.data, job.attributes)
  // await programma1.moveJobToProcessing(job.id)
})

// programma2.receiveJobs({ topicName: 'smsWorker', maxJobs: 2, heartBeat: 1 }, async (job) => {
//   console.log('worker 2 ', job.id, job.data, job.attributes)
//   // await programma2.moveJobToProcessing(job.id)
// })


setTimeout(() => {
  console.log('shutting down')
  programma1.shutdown()
  setTimeout(() => {
    console.log('starting again')
    programma1.start()
  }, 5000)
}, 10000)



