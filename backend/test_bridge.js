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
    console.log();
    
    // Create a Python script that imports and calls the function
    const pythonCode = ;

    // Run the Python script
    const result = spawnSync(pythonPath, ['-c', pythonCode], {
        cwd: scriptDir,
        encoding: 'utf-8'
    });
    
    if (result.status !== 0) {
        console.error();
        return null;
    }
    
    try {
        return JSON.parse(result.stdout.trim());
    } catch (e) {
        console.error();
        console.error();
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
        console.log();
        console.log();
        passCount++;
    } else {
        console.log();
        console.log();
        failCount++;
    }
    console.log('');
});

console.log();
