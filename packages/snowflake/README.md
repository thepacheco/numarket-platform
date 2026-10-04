# packages/snowflake (Stage B)

The single choke point to Snowflake (Spec §3.3, §8). Only the worker imports
it. Query tagging, cost limits, key-pair service users, and the per-tenant
account layout (RAW_*, STAGING, CLEAN, SERVE, APP, META, AUDIT) live here.
