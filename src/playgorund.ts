import { Programma } from './index'


const programma = new Programma({
  host: 'dev-db-vincere.caqv06asifia.us-east-2.rds.amazonaws.com',
  user: 'vinceredevuser',
  password: 'smokingVincere',
  database: 'postgres',
})

// programma.addJob('cool', {
//   data: { something: '123' },
//   attributes: { retry: 10 },
//   runAfterSeconds: 60,
// })
//   .then(r => {
//     console.log('job have been added ', r)
//   })
//   .catch(console.error)

programma.test('cool', 10)
  .then(console.log)
  .catch(console.error)



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



