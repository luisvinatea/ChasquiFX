/**
 * Verify and optimize MongoDB for preventing duplicate documents
 * 
 * This script:
 * 1. Checks for any duplicate documents
 * 2. Verifies all unique indexes are in place
 * 3. Creates a report of the database state
 * 4. Provides recommendations for performance and data integrity
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../src/db/mongodb.js';
import { initLogger } from "../src/utils/logger.js";
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize logger
const logger = initLogger();

// Define expected unique constraints for each collection
const EXPECTED_INDEXES = {
  forexcaches: ['cacheKey'],
  flightcaches: ['cacheKey'],
  apicalllogs: ['fingerprint'],
};

// Define collections to check for duplicates
const DUPLICATE_CHECKS = [
  { collection: 'forexcaches', field: 'cacheKey' },
  { collection: 'flightcaches', field: 'cacheKey' },
  { collection: 'apicalllogs', field: 'fingerprint', fallbackComposite: ['endpoint', 'timestamp', 'userId'] },
];

// Parse command line arguments
const args = process.argv.slice(2);
const generateReport = args.includes('--report');

/**
 * Check if all expected indexes exist in the database
 */
async function verifyIndexes() {
  logger.info('Verifying indexes...');
  
  const db = mongoose.connection.db;
  let missingIndexes = [];
  
  for (const [collection, expectedUniqueFields] of Object.entries(EXPECTED_INDEXES)) {
    try {
      // Get the collection
      const collectionObj = db.collection(collection);
      
      // Get existing indexes
      const indexes = await collectionObj.indexes();
      
      // Check for each expected unique field
      for (const field of expectedUniqueFields) {
        // Find if there's an index for this field that is unique
        const indexExists = indexes.some(index => {
          // Check if this index contains our field and is unique
          return index.key[field] !== undefined && index.unique === true;
        });
        
        if (!indexExists) {
          missingIndexes.push({ collection, field });
          logger.warn(`Missing unique index on ${collection}.${field}`);
        }
      }
    } catch (error) {
      logger.error(`Error verifying indexes for ${collection}: ${error.message}`);
    }
  }
  
  return missingIndexes;
}

/**
 * Check for duplicate documents in the database
 */
async function checkForDuplicates() {
  logger.info('Checking for duplicates...');
  
  const db = mongoose.connection.db;
  let duplicatesFound = [];
  
  for (const check of DUPLICATE_CHECKS) {
    try {
      // Get the collection
      const collectionObj = db.collection(check.collection);
      
      // First try to find duplicates using the main field
      let duplicates;
      if (check.field) {
        const pipeline = [
          { $group: { _id: `$${check.field}`, count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $project: { _id: 1, count: 1 } }
        ];
        
        duplicates = await collectionObj.aggregate(pipeline).toArray();
      }
      
      // If no duplicates found by main field, try fallback composite fields
      if ((!duplicates || duplicates.length === 0) && check.fallbackComposite) {
        const groupId = {};
        check.fallbackComposite.forEach(field => {
          groupId[field] = `$${field}`;
        });
        
        const pipeline = [
          { $group: { _id: groupId, count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $project: { _id: 1, count: 1 } }
        ];
        
        duplicates = await collectionObj.aggregate(pipeline).toArray();
      }
      
      if (duplicates && duplicates.length > 0) {
        const totalDuplicates = duplicates.reduce((sum, group) => sum + group.count - 1, 0);
        duplicatesFound.push({
          collection: check.collection,
          uniqueField: check.field || `composite(${check.fallbackComposite.join(', ')})`,
          groups: duplicates.length,
          count: totalDuplicates,
        });
        
        logger.warn(`Found ${duplicates.length} groups with ${totalDuplicates} duplicate documents in ${check.collection}`);
      } else {
        logger.info(`No duplicates found in ${check.collection}`);
      }
    } catch (error) {
      logger.error(`Error checking duplicates for ${check.collection}: ${error.message}`);
    }
  }
  
  return duplicatesFound;
}

/**
 * Generate a report on database health in terms of duplicates and indexes
 */
async function generateDbReport(missingIndexes, duplicatesFound) {
  if (!generateReport) return;

  try {
    logger.info('Generating database report...');
    
    // Create reports directory if it doesn't exist
    const reportDir = path.resolve('../logs/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.resolve(reportDir, `mongodb-duplicate-report-${timestamp}.md`);
    
    // Generate the report content
    let report = `# MongoDB Duplicate Documents Report\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n\n`;
    
    // Add missing indexes section
    report += `## Indexes Status\n\n`;
    if (missingIndexes.length === 0) {
      report += `✅ All expected unique indexes are in place.\n\n`;
    } else {
      report += `⚠️ Missing ${missingIndexes.length} unique indexes:\n\n`;
      missingIndexes.forEach(({ collection, field }) => {
        report += `- ${collection}.${field}\n`;
      });
      report += `\n`;
    }
    
    // Add duplicates section
    report += `## Duplicate Documents\n\n`;
    if (duplicatesFound.length === 0) {
      report += `✅ No duplicate documents found in any collection.\n\n`;
    } else {
      report += `⚠️ Found duplicate documents:\n\n`;
      duplicatesFound.forEach(({ collection, uniqueField, groups, count }) => {
        report += `- **${collection}**: ${count} duplicates in ${groups} groups (by ${uniqueField})\n`;
      });
      report += `\n`;
    }
    
    // Add recommendations section
    report += `## Recommendations\n\n`;
    
    if (missingIndexes.length > 0) {
      report += `1. Create missing unique indexes by running:\n`;
      report += `   \`\`\`\n   node create-indexes.js\n   \`\`\`\n\n`;
    }
    
    if (duplicatesFound.length > 0) {
      report += `2. Remove duplicate documents by running:\n`;
      report += `   \`\`\`\n   ./check-duplicates.sh\n   \`\`\`\n\n`;
      
      report += `3. Review your data insertion code to ensure you're using upserts instead of direct inserts.\n\n`;
    }
    
    report += `4. Schedule regular duplicate checks in your maintenance routine.\n\n`;
    
    // Write the report to a file
    fs.writeFileSync(reportPath, report);
    logger.info(`Report generated at ${reportPath}`);
    
    return reportPath;
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
  }
}

/**
 * Run the verification and reporting process
 */
async function verifyAndOptimize() {
  try {
    // Connect to the database
    logger.info('Connecting to MongoDB...');
    const connection = await connectToDatabase();
    
    // Verify indexes
    const missingIndexes = await verifyIndexes();
    
    // Check for duplicates
    const duplicatesFound = await checkForDuplicates();
    
    // Generate report if requested
    if (generateReport) {
      await generateDbReport(missingIndexes, duplicatesFound);
    }
    
    // Summary
    logger.info('\n===== SUMMARY =====');
    logger.info(`Missing indexes: ${missingIndexes.length}`);
    logger.info(`Collections with duplicates: ${duplicatesFound.length}`);
    
    if (missingIndexes.length > 0 || duplicatesFound.length > 0) {
      logger.info('\nRecommendations:');
      
      if (missingIndexes.length > 0) {
        logger.info('- Run "node create-indexes.js" to create missing indexes');
      }
      
      if (duplicatesFound.length > 0) {
        logger.info('- Run "./check-duplicates.sh" to remove duplicates');
        logger.info('- Use upserts instead of direct inserts in your code');
      }
    } else {
      logger.info('\n✅ Your MongoDB collections are optimized and free of duplicates!');
    }
    
    // Close the connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    
    // Close the connection
    try {
      await mongoose.connection.close();
    } catch (err) {
      // Ignore errors during connection closing
    }
    
    process.exit(1);
  }
}

// Run the script
verifyAndOptimize();
