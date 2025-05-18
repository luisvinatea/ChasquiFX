# Dual Backend Deployment Checklist

Use this checklist when deploying the ChasquiFX dual backend system.

## Pre-Deployment

- [ ] Verify all Node adapter functions are working
- [ ] Check that the Node bridge is properly implemented
- [ ] Run the test scripts to ensure Python-Node.js communication works
- [ ] Update any environment variables required by both systems

## Python Backend Deployment

- [ ] Install Python dependencies:
  ```
  pip install -r requirements.txt
  ```
- [ ] Configure Python environment variables
- [ ] Start the Python API service:
  ```
  uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
  ```

## Node.js Backend Deployment

- [ ] Install Node.js dependencies:
  ```
  cd backend/node && npm install
  ```
- [ ] Configure Node.js environment variables:
  - PYTHON_PATH: Path to Python executable
  - PORT: Port for Node.js API (default: 3001)
- [ ] Start the Node.js API service:
  ```
  cd backend/node && npm run start
  ```

## Post-Deployment Verification

- [ ] Test the Node.js API endpoints
- [ ] Verify Python data processing works through the Node.js API
- [ ] Check logs for any errors
- [ ] Monitor performance of the bridge between Node.js and Python

## Rollback Procedure

If deployment fails:

1. Stop both services
2. Restore backups from `/home/luisvinatea/DEVinatea/Repos/chasquifx/backend/backup_20250518_182457`
3. Redeploy the previous version
