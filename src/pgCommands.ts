import * as uuid from 'uuid'
import { Pool, PoolConfig, QueryResult } from 'pg'
import { JobStates } from './constants'

export class PgCommand {
  private pool: Pool
  private tableName: string
  public static instance: PgCommand | null = null

  private constructor (config: PoolConfig, tableName: string = 'programmajobs') {
    this.pool = new Pool(config)
    this.tableName = tableName
  }

  public static createInstance(config: PoolConfig, tableName: string = 'programmajobs') {
    if (!PgCommand.instance) {
      PgCommand.instance = new PgCommand(config, tableName)
    }
    return PgCommand.instance
  }

  public static getInstance(): PgCommand {
    return PgCommand.instance as PgCommand
  }

  public shutdown() {
    this.pool.end()
  }

  public addJob(
    name: string,
    data: {},
    opts: {},
    startAfter: string | Date,
    markFailedAfter: number | null,
  ): Promise<QueryResult<any>> {
    return this.pool.query(
      `
      INSERT INTO ${this.tableName} (
        id, name, data, opts, state, start_after, mark_failed_after
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `,
      [uuid.v4(), name, data, opts, JobStates.CREATED, startAfter, markFailedAfter]
    )
  }

  public getJobsToBeProcessed(
    name: string,
    limit: number,
  ): Promise<QueryResult<any>> {
    return this.pool.query(
      `
        with claimJob as (
          SELECT id
          FROM ${this.tableName}
          WHERE state = '${JobStates.CREATED}'
            AND name = $1
            AND start_after < now()
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        Update ${this.tableName} as job
        SET state = '${JobStates.READY}'
        from claimJob
        where job.id = claimJob.id
        Returning job.id, job.data, job.opts;
      `,
      [name, limit]
    )
  }
}