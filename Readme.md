## Programma

Programma is a task scheduler and an

1. Scheduler will run every 30seconds. You can assumer a precision of minute. Not seconds. e.g, run job today at 4:30
2. we don't have any exponential back-off strategy. it will try to run job multiple times and mark it to fail if it cannot process it
3. states will be created, processing, failed, completed, deleted


client.every('10sec', 'topicName', (job) => {
  job.processing()
  job.done()
})

const program = new Programma('')

