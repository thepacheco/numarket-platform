# Worker (Stage B)

The Node/TypeScript service that runs pipelines and is the only code that
talks to Snowflake (Spec §3.3). Runs in a container on AWS (Fargate) with a
static outbound IP, a durable job queue, and per-tenant schedules.

Not built yet. Until it exists, the Portal publishes demo snapshots itself
(`packages/db/src/repo/snapshots.ts`, `publishSimulated`), and refuses to do
so for any non-demo workspace in production.
