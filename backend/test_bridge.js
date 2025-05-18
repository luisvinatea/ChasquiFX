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
function testPythonFunction(module, functionName, args = []) {
    console.log(`Testing "${module}.${functionName}"...`);
    
    // Create a Python script that imports and calls the function
    const pythonCode = `
import sys
import json
import importlib

try:
    # Import the module dynamically
    module=importlib.import_module("${module}")

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
        console.error(`Error: "${result.stderr}"`);
        return null;
    }
    
    try {
        return JSON.parse(result.stdout.trim());
    } catch (e) {
        console.error(`Error parsing Python output: "${e.message}"`);
        console.error(`Output was: "${result.stdout}"`);
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
        console.log(`✓ "${test.module}".${test.function} passed`);
        console.log(`  Result: "${JSON.stringify(result).substring(0, 100)}"...`);
        passCount++;
    } else {
        console.log(`✗ "${test.module}"."${test.function}" failed`);
        console.log(`  Error: "${result ? result.error : 'Unknown error'}"`);
        failCount++;
    }
    console.log('');
});

console.log(`Tests complete: "${passCount}" passed, "${failCount}" failed`);
