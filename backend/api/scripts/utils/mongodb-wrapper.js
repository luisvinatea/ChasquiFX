/**
 * MongoDB compatibility wrapper module
 * 
 * This module provides a compatibility layer to use the ES module mongodb.js
 * with CommonJS require statements in our scripts.
 */

// Use dynamic import to load ES module
async function importMongodbModule() {
  try {
    // Dynamic import of ES module
    const module = await import('../../src/db/mongodb.js');
    return module;
  } catch (error) {
    console.error('Error importing mongodb module:', error.message);
    throw error;
  }
}

// Wrapper for connectToDatabase function
async function connectToDatabase() {
  try {
    const { connectToDatabase: originalConnect } = await importMongodbModule();
    return await originalConnect();
  } catch (error) {
    console.error('Connection to database failed:', error.message);
    throw error;
  }
}

// Export the wrapper functions for CommonJS usage
module.exports = {
  connectToDatabase,
  importMongodbModule
};
