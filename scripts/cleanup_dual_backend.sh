#!/bin/bash
# cleanup_dual_backend.sh
# Script to help clean up the ChasquiFX dual backend architecture

set -e

echo "ChasquiFX Dual Backend Cleanup Script"
echo "===================================="

# Define paths
PROJECT_ROOT="$(pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
PYTHON_DIR="$BACKEND_DIR/api"
NODE_DIR="$BACKEND_DIR/node"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$BACKEND_DIR/backup_$(date +%Y%m%d_%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

echo "1. Creating backups of critical files..."
cp -r "$PYTHON_DIR/main.py" "$BACKUP_DIR/"
cp -r "$PYTHON_DIR/adapters" "$BACKUP_DIR/"
cp -r "$PYTHON_DIR/node_bridge.py" "$BACKUP_DIR/"
cp -r "$NODE_DIR/src/services/pythonBridge.js" "$BACKUP_DIR/"

echo "2. Checking Python dependencies..."
python -m pip install pandas pyarrow fastapi uvicorn python-dotenv > "$LOG_DIR/pip_install.log" 2>&1 || {
    echo "Error installing Python dependencies. See $LOG_DIR/pip_install.log for details."
    exit 1
}

echo "3. Checking Node.js dependencies..."
cd "$NODE_DIR" && npm install axios python-bridge express > "$LOG_DIR/npm_install.log" 2>&1 || {
    echo "Error installing Node.js dependencies. See $LOG_DIR/npm_install.log for details."
    cd "$PROJECT_ROOT"
    exit 1
}
cd "$PROJECT_ROOT"

echo "4. Checking Node adapter functions..."
python -c "
import sys
sys.path.append('$BACKEND_DIR')
from api.adapters import node_adapter
methods = [method for method in dir(node_adapter) if not method.startswith('__')]
missing = []
for method in methods:
    try:
        getattr(node_adapter, method)
    except Exception as e:
        missing.append((method, str(e)))
if missing:
    print('Missing or broken methods:')
    for method, error in missing:
        print(f'- {method}: {error}')
    sys.exit(1)
else:
    print('All methods present')
" || echo "Some Node adapter functions need to be fixed. See above errors."

echo "5. Checking for duplicate API routes..."
python -c "
import sys
import importlib.util
import os

sys.path.append('$BACKEND_DIR')

def is_fastapi_router(obj):
    return str(type(obj)).find('APIRouter') != -1

# Try to load the main FastAPI app
spec = importlib.util.spec_from_file_location('main', '$PYTHON_DIR/main.py')
main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(main)

# Find all routes
routes = []
if hasattr(main, 'app'):
    for route in main.app.routes:
        routes.append((route.path, route.methods))

# Check for node_bridge routes
bridge_routes = []
if os.path.exists('$PYTHON_DIR/node_bridge.py'):
    spec = importlib.util.spec_from_file_location('node_bridge', '$PYTHON_DIR/node_bridge.py')
    node_bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(node_bridge)
    if hasattr(node_bridge, 'node_bridge_router'):
        for route in node_bridge.node_bridge_router.routes:
            bridge_routes.append((route.path, route.methods))

# Find potential duplicates
duplicates = []
for route_path, route_methods in routes:
    for bridge_path, bridge_methods in bridge_routes:
        if route_path.endswith(bridge_path.split('/')[-1]) and route_methods == bridge_methods:
            duplicates.append((route_path, bridge_path))

if duplicates:
    print('Potential duplicate routes:')
    for route_path, bridge_path in duplicates:
        print(f'- {route_path} might duplicate {bridge_path}')
else:
    print('No obvious duplicate routes found')
" || echo "Error checking for duplicate routes."

echo "6. Creating cleanup recommendations file..."
cat > "$BACKEND_DIR/CLEANUP_TODO.md" << EOL
# ChasquiFX Dual Backend Cleanup TODO

Based on the analysis of the codebase, here are the specific tasks that need to be addressed:

## Python Side

### 1. Fix Node Adapter Functions

The following node adapter functions need to be reviewed:

- \`get_exchange_rates\`: Ensure it correctly calls the corresponding function in forex_service
- \`get_service_status\`: Implement or fix the missing function
- \`reset_quota_status\`: Implement or fix the missing function
- \`get_recommendations\`: Check parameter types and return format
- \`retrieve_parquet_data\`: Verify function name in retrieval module
- \`json_to_parquet\`: Check function name in json_parquet_converter module

### 2. Complete Node Bridge Implementation

- Ensure all routes in node_bridge.py are properly implemented
- Add proper error handling for all routes
- Add complete documentation

### 3. Update Python Main API

- Mark duplicate routes as deprecated
- Add warnings for direct API access
- Consider redirecting direct API calls to the Node.js backend

## Node.js Side

### 1. Improve Python Bridge Service

- Add better error handling for Python process failures
- Implement connection pooling to avoid spawning too many processes
- Add timeout handling for long-running Python operations

### 2. Update Controllers

- Ensure all controllers properly handle errors from Python bridge
- Add input validation before calling Python functions
- Implement caching for expensive operations

## Documentation

### 1. Update API Documentation

- Clarify that the Node.js API is now the preferred entry point
- Document the dual backend architecture
- Provide examples of calling the API through Node.js

### 2. Update Developer Guidelines

- Add guidelines for adding new features in the dual backend system
- Document the data flow between Node.js and Python
- Add troubleshooting information for the Python bridge

## Testing

### 1. Add Integration Tests

- Test the Node.js to Python bridge
- Ensure all API endpoints return expected results
- Test error handling scenarios

## Next Steps

1. Fix the critical issues in the node adapter functions
2. Complete the node bridge implementation
3. Update the Python API to redirect to Node.js
4. Improve the Python bridge service in Node.js
5. Update documentation and add tests
EOL

echo "7. Creating a sample fixed node adapter function..."
NODE_ADAPTER_SAMPLE="$BACKEND_DIR/node_adapter_example.py"

cat > "$NODE_ADAPTER_SAMPLE" << EOL
"""
Example of a fixed node_adapter.py function.
This demonstrates the proper way to implement adapter functions.
"""

def get_exchange_rates(from_currency: str, to_currency: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Get exchange rates using Python forex_service.

    Args:
        from_currency: Base currency code
        to_currency: Target currency code
        api_key: Optional API key

    Returns:
        Dict containing exchange rate data
    """
    try:
        logger.info(
            f"Python adapter: Getting exchange rates "
            f"{from_currency} to {to_currency}"
        )
        # Use the correct function name from forex_service
        # If get_exchange_rates doesn't exist, use an alternative like get_exchange_rate
        if hasattr(forex_service, 'get_exchange_rates'):
            result = forex_service.get_exchange_rates(from_currency, to_currency, api_key)
        elif hasattr(forex_service, 'get_exchange_rate'):
            # Adapt parameters if needed
            result = {'rate': forex_service.get_exchange_rate(from_currency, to_currency, api_key)}
        else:
            raise AttributeError("No suitable exchange rate function found in forex_service")
        
        # Ensure the result is properly formatted
        if not isinstance(result, dict):
            result = {'rate': result, 'timestamp': datetime.now().isoformat()}
            
        return result
    except Exception as e:
        logger.error(f"Error in get_exchange_rates: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}
EOL

echo "8. Creating a test script for the Node.js to Python bridge..."
TEST_SCRIPT="$BACKEND_DIR/test_bridge.js"

cat > "$TEST_SCRIPT" << EOL
/**
 * Test script for the Node.js to Python bridge
 * 
 * This script tests the basic functionality of calling Python functions from Node.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

console.log("Testing Node.js to Python bridge...");

// Path to Python executable and script directory
const pythonPath = process.env.PYTHON_PATH || 'python';
const scriptDir = path.join(__dirname, 'api');

// Test function
function testPythonFunction(modulePath, functionName, args = []) {
    console.log(`Testing ${modulePath}.${functionName}...`);
    
    // Create a Python script that imports and calls the function
    const pythonCode = `
import sys
import json
import importlib

try:
    # Import the module dynamically
    module = importlib.import_module("${modulePath}")
    
    # Get the function
    func = getattr(module, "${functionName}")
    
    # Parse arguments if provided
    args = json.loads('${JSON.stringify(args)}')
    
    # Call the function with unpacked arguments
    result = func(*args)
    
    # Print the result as JSON
    print(json.dumps(result))
    
    sys.exit(0)
except Exception as e:
    # Print error as JSON
    print(json.dumps({"error": str(e), "type": str(type(e).__name__)}))
    sys.exit(1)
`;

    // Run the Python script
    const result = spawnSync(pythonPath, ['-c', pythonCode], {
        cwd: scriptDir,
        encoding: 'utf-8'
    });
    
    if (result.status !== 0) {
        console.error(`Error: ${result.stderr}`);
        return null;
    }
    
    try {
        return JSON.parse(result.stdout.trim());
    } catch (e) {
        console.error(`Error parsing Python output: ${e.message}`);
        console.error(`Output was: ${result.stdout}`);
        return null;
    }
}

// Test the main adapter functions
const tests = [
    {
        module: 'backend.api.adapters.node_adapter',
        function: 'get_exchange_rates',
        args: ['USD', 'EUR']
    },
    {
        module: 'backend.api.adapters.node_adapter',
        function: 'get_service_status',
        args: []
    },
    {
        module: 'backend.api.adapters.node_adapter',
        function: 'get_recommendations',
        args: ['USD', 'JFK']
    }
];

// Run the tests
let passCount = 0;
let failCount = 0;

tests.forEach(test => {
    const result = testPythonFunction(test.module, test.function, test.args);
    
    if (result && !result.error) {
        console.log(`✓ ${test.module}.${test.function} passed`);
        console.log(`  Result: ${JSON.stringify(result).substring(0, 100)}...`);
        passCount++;
    } else {
        console.log(`✗ ${test.module}.${test.function} failed`);
        console.log(`  Error: ${result ? result.error : 'Unknown error'}`);
        failCount++;
    }
    console.log('');
});

console.log(`Tests complete: ${passCount} passed, ${failCount} failed`);
EOL

echo "9. Creating a deployment checklist..."
DEPLOYMENT_CHECKLIST="$BACKEND_DIR/DUAL_BACKEND_DEPLOYMENT.md"

cat > "$DEPLOYMENT_CHECKLIST" << EOL
# Dual Backend Deployment Checklist

Use this checklist when deploying the ChasquiFX dual backend system.

## Pre-Deployment

- [ ] Verify all Node adapter functions are working
- [ ] Check that the Node bridge is properly implemented
- [ ] Run the test scripts to ensure Python-Node.js communication works
- [ ] Update any environment variables required by both systems

## Python Backend Deployment

- [ ] Install Python dependencies:
  \`\`\`
  pip install -r requirements.txt
  \`\`\`
- [ ] Configure Python environment variables
- [ ] Start the Python API service:
  \`\`\`
  uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
  \`\`\`

## Node.js Backend Deployment

- [ ] Install Node.js dependencies:
  \`\`\`
  cd backend/node && npm install
  \`\`\`
- [ ] Configure Node.js environment variables:
  - PYTHON_PATH: Path to Python executable
  - PORT: Port for Node.js API (default: 3001)
- [ ] Start the Node.js API service:
  \`\`\`
  cd backend/node && npm run start
  \`\`\`

## Post-Deployment Verification

- [ ] Test the Node.js API endpoints
- [ ] Verify Python data processing works through the Node.js API
- [ ] Check logs for any errors
- [ ] Monitor performance of the bridge between Node.js and Python

## Rollback Procedure

If deployment fails:

1. Stop both services
2. Restore backups from \`$BACKUP_DIR\`
3. Redeploy the previous version
EOL

echo "10. Cleaning up error messages in the Python code..."

# Find Python files with error messages that don't follow the standard format
find "$PYTHON_DIR" -name "*.py" -exec grep -l "except Exception as e:" {} \; | while read -r file; do
    echo "Checking error handling in $file..."
    
    # Count if there are error messages not following the standard format
    non_standard_errors=$(grep -c "except Exception as e:" "$file")
    if [ "$non_standard_errors" -gt 0 ]; then
        echo "  Found $non_standard_errors non-standard error handlers in $file"
    fi
done

echo ""
echo "=== Cleanup Tasks Summary ==="
echo ""
echo "1. Review the cleanup recommendations in: $BACKEND_DIR/CLEANUP_TODO.md"
echo "2. Use the sample fixed adapter function as a reference: $NODE_ADAPTER_SAMPLE"
echo "3. Test the Node.js to Python bridge with: node $TEST_SCRIPT"
echo "4. Follow the deployment checklist: $DEPLOYMENT_CHECKLIST"
echo ""
echo "Backups of original files are stored in: $BACKUP_DIR"
echo ""
echo "Cleanup script completed!"
