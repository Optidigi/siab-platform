BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '1min';

WITH repaired AS (
  UPDATE published_site_snapshots
     SET snapshot = jsonb_set(
       jsonb_set(snapshot, '{tenantId}', to_jsonb(tenant_id::text), true),
       '{manifest,tenantId}', to_jsonb(tenant_id::text), true
     )
   WHERE tenant_id IN (1, 2)
     AND snapshot IS NOT NULL
     AND (
       jsonb_typeof(snapshot->'tenantId') = 'number'
       OR jsonb_typeof(snapshot#>'{manifest,tenantId}') = 'number'
     )
  RETURNING id, tenant_id, snapshot->>'tenantId' AS snapshot_tenant_id, snapshot#>>'{manifest,tenantId}' AS manifest_tenant_id
)
SELECT *
  FROM repaired
 ORDER BY tenant_id, id;

COMMIT;
