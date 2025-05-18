# Deprecated ChasquiFX Components

This directory contains files that were previously part of the ChasquiFX Python API but have been migrated to the Node.js backend as part of the hybrid architecture implementation.

## Contents

- `auth.py.deprecated`: The original authentication middleware
- `forex.py.deprecated`: The original forex API endpoints
- `recommendations.py.deprecated`: The original travel recommendations API endpoints

## Reason for Deprecation

These files have been replaced by equivalent functionality in the Node.js backend:

- `/backend/node/src/middleware/auth.js`
- `/backend/node/src/routes/forex.js`
- `/backend/node/src/routes/recommendations.js`

## Stub Files

Minimal stub files have been created in place of the original files to maintain backward compatibility for any code that might still import them.

For more information on the migration, see `/backend/MIGRATION_NOTES.md`.

## Removal Timeline

These deprecated files are kept for reference and will be fully removed in a future release (likely v1.4.0 or v1.5.0).
