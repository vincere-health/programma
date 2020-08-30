import { EventEmitter } from 'events'
import { Pool, PoolConfig, QueryResult } from 'pg'
import { JobStates, EventStates } from './constants'

export class PgCommand extends EventEmitter {
  public pool: Pool | null
  private schemaName: string
  private config: PoolConfig

  public constructor (config: PoolConfig, schemaName: string) {
    super()
    this.pool = null
    this.config = config
    this.schemaName = schemaName
  }

  public start() {
    this.pool = new Pool(this.config)
    this.pool.on(EventStates.ERROR, (e) => this.emit(EventStates.ERROR, e))
  }

  public stop() {
    this.pool?.end()
    this.pool = null
  }

  public async migrate() {
    let pool = this.pool as Pool
    try {
      await pool.query('BEGIN')
      await pool.query(`Create SCHEMA if not exists ${this.schemaName};`)
      await pool.query(`Create SCHEMA if not exists ${this.schemaName};`)
      await pool.query(`Create extension if not exists pgcrypto;`)
      await pool.query(`
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
      `)
      await pool.query(`CREATE INDEX if not exists get_jobs ON ${this.schemaName}.jobs (topicName, start_after, id)`)
      await pool.query(`CREATE INDEX if not exists get_fifo_jobs ON ${this.schemaName}.jobs (start_after, id)`)
      await pool.query('COMMIT')
    } catch (e) {
      await pool.query('ROLLBACK')
    }
  }

  public addJob(
    topicName: string,
    data: {},
    opts: {},
    startAfter: string | Date,
    retryAfterSeconds: number | null,
  ): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(
      `
      INSERT INTO ${this.schemaName}.jobs (
        topicName, data, attributes, state, start_after, retry_after_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `,
      [topicName, data, opts, JobStates.CREATED, startAfter, retryAfterSeconds]
    )
  }

  public changeJobState(
    id: string,
    state: JobStates
  ): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(
      `
        Update ${this.schemaName}.jobs
        SET state = '${state}'
        where id = '${id}'
      `
    )
  }

  public ping(): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(`Select now();`)
  }

  public getJobDetails(
    id: string,
  ): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(
      `
        Select * from ${this.schemaName}.jobs
        where id = '${id}'
      `
    )
  }

  public deleteJob(
    id: string,
  ): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(
      `
        Delete from ${this.schemaName}.jobs
        where id = '${id}'
      `
    )
  }

  public getJobsToBeProcessed(
    topicName: string,
    limit: number,
  ): Promise<QueryResult<any>> {
    let pool = this.pool as Pool
    return pool.query(
      `
        with claimJob as (
          SELECT id
          FROM ${this.schemaName}.jobs
          WHERE (
            state = '${JobStates.CREATED}'
            AND topicName = $1
            AND start_after < now()
          ) OR (
            state = '${JobStates.ACTIVE}'
            AND topicName = $1
            AND retry_after_seconds is not null
            AND retry_after_seconds < EXTRACT(EPOCH FROM (now() - started_at))
          )
          ORDER by start_after asc, id asc
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        Update ${this.schemaName}.jobs as job
        SET state = '${JobStates.ACTIVE}',
        started_at = now()
        from claimJob
        where job.id = claimJob.id
        Returning job.id, job.data, job.attributes;
      `,
      [topicName, limit]
    )
  }
}