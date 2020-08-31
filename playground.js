const { Programma } = require('./dist')

const programma1 = new Programma({
  connectionString: `postgres://hadijaveed:@localhost:5432/postgres`,
  max: 50,
}, 'jobsSchema')

function addtasks (instance, topic) {
  console.time('enqueue')
  Promise.all(
    Array(1000).fill(0)
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
  })
  .catch(console.error)  
}

programma1.start(true).then(() => {
  // addtasks(programma1, 'smsWorker')
  programma1.getJob('c1358556-78b5-4703-ac0e-7a63887baff7')
    .then(console.log)
    .catch(console.error)

  programma1.setAttributes('c1358556-78b5-4703-ac0e-7a63887baff7', { cool: 123, nice: 'shit' })
    .then(console.log)
    .catch(console.error)
})

// programma2.start(true).then(() => {
//   addtasks(programma2, 'smsWorker')
// })

programma1.receiveJobs({ topicName: 'smsWorker' }, async (job) => {
  console.log('worker 1 ', job.id, job.data, job.attributes)
  await programma1.moveJobToProcessing(job.id)
})

// programma2.receiveJobs({ topicName: 'smsWorker', maxJobs: 2, heartBeat: 1 }, async (job) => {
//   console.log('worker 2 ', job.id, job.data, job.attributes)
//   // await programma2.moveJobToProcessing(job.id)
// })


// setTimeout(() => {
//   console.log('shutting down')
//   programma1.shutdown()
//   setTimeout(() => {
//     console.log('starting again')
//     programma1.start()
//   }, 5000)
// }, 10000)



