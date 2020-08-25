## Programma


Jobs Table
```
id  uuid primary key not null default gen_random_uuid()
topic varchar(255) not null
start_after  
completed_at
created_at
status
mark_failed_after
data JSONB
job_opts JSONB
```

1. Scheduler will run every 30seconds. You can assumer a precision of minute. Not seconds. e.g, run job today at 4:30
2. we don't have any exponential back-off strategy. it will try to run job multiple times and mark it to fail if it cannot process it
3. states will be created, processing, failed, completed, deleted


client.every('10sec', 'topicName', (job) => {
  job.processing()
  job.done()
})

const program = new Programma('')

