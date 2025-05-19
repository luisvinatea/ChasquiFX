/**
 * Cache Dashboard Generator
 * 
 * Generates a dashboard for monitoring cache usage
 * Run with: node generate-cache-dashboard.js [--html] [--output path/to/output]
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/db/mongodb');
const { ForexCache, FlightCache, ApiCallLog } = require('../src/db/schemas');

// Parse command line arguments
const args = process.argv.slice(2);
let outputHtml = false;
let outputPath = 'cache-dashboard.json';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--html') {
    outputHtml = true;
    outputPath = 'cache-dashboard.html';
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputPath = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    console.log('Cache Dashboard Generator');
    console.log('Usage: node generate-cache-dashboard.js [options]');
    console.log('Options:');
    console.log('  --html            Generate HTML output instead of JSON');
    console.log('  --output PATH     Specify output file path');
    console.log('  --help            Show this help message');
    process.exit(0);
  }
}

/**
 * Get cache statistics for a collection
 * @param {mongoose.Model} collection - MongoDB collection model
 * @returns {Promise<Object>} - Collection statistics
 */
async function getCollectionStats(collection) {
  const total = await collection.countDocuments();
  
  // Group by expiration status
  const now = new Date();
  const active = await collection.countDocuments({ expiresAt: { $gt: now } });
  const expired = await collection.countDocuments({ expiresAt: { $lte: now } });
  
  // Get the oldest and newest documents
  const oldest = await collection.findOne().sort({ importedAt: 1 }).limit(1);
  const newest = await collection.findOne().sort({ importedAt: -1 }).limit(1);
  
  // Calculate average document size
  const avgSize = await collection.aggregate([
    {
      $sample: { size: Math.min(total, 100) } // Sample up to 100 documents
    },
    {
      $project: {
        size: { $bsonSize: "$$ROOT" }
      }
    },
    {
      $group: {
        _id: null,
        avgSize: { $avg: "$size" }
      }
    }
  ]).exec();
  
  const averageSize = avgSize.length > 0 ? avgSize[0].avgSize : 0;
  
  return {
    total,
    active,
    expired,
    oldestDocument: oldest ? {
      cacheKey: oldest.cacheKey,
      importedAt: oldest.importedAt,
      expiresAt: oldest.expiresAt
    } : null,
    newestDocument: newest ? {
      cacheKey: newest.cacheKey,
      importedAt: newest.importedAt,
      expiresAt: newest.expiresAt
    } : null,
    averageDocumentSize: averageSize,
    totalSizeEstimate: averageSize * total
  };
}

/**
 * Get API call statistics
 * @returns {Promise<Object>} - API call statistics
 */
async function getApiCallStats() {
  const total = await ApiCallLog.countDocuments();
  
  // Get API calls by endpoint
  const endpointStats = await ApiCallLog.aggregate([
    {
      $group: {
        _id: "$endpoint",
        count: { $sum: 1 },
        averageStatus: { $avg: "$responseStatus" }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]).exec();
  
  // Get API calls by day
  const dayStats = await ApiCallLog.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
    },
    {
      $project: {
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day"
              }
            }
          }
        },
        count: 1,
        _id: 0
      }
    }
  ]).exec();
  
  return {
    total,
    byEndpoint: endpointStats,
    byDay: dayStats
  };
}

/**
 * Generate dashboard data
 * @returns {Promise<Object>} - Dashboard data
 */
async function generateDashboardData() {
  try {
    console.log('Generating cache dashboard data...');
    
    // Connect to MongoDB
    await connectToDatabase();
    console.log('Connected to MongoDB');
    
    // Get collection statistics
    const forexStats = await getCollectionStats(ForexCache);
    const flightStats = await getCollectionStats(FlightCache);
    const apiCallStats = await getApiCallStats();
    
    // Get overall database statistics
    const dbStats = await mongoose.connection.db.stats();
    
    // Calculate cache hit rates (this is an estimate based on active vs expired ratio)
    const forexHitRate = forexStats.active / (forexStats.active + forexStats.expired) || 0;
    const flightHitRate = flightStats.active / (flightStats.active + flightStats.expired) || 0;
    
    // Compile dashboard data
    const dashboardData = {
      generatedAt: new Date().toISOString(),
      databaseStats: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        totalCollections: dbStats.collections,
        totalDocuments: dbStats.objects
      },
      cacheStats: {
        forex: {
          ...forexStats,
          hitRate: forexHitRate
        },
        flights: {
          ...flightStats,
          hitRate: flightHitRate
        }
      },
      apiCalls: apiCallStats
    };
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    return dashboardData;
  } catch (error) {
    console.error('Failed to generate dashboard:', error.message);
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore error on close
    }
    throw error;
  }
}

/**
 * Generate HTML dashboard
 * @param {Object} data - Dashboard data
 * @returns {string} - HTML content
 */
function generateHtmlDashboard(data) {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const formatPercentage = (value) => {
    return (value * 100).toFixed(2) + '%';
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChasquiFX Cache Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-box {
      background: #f5f5f5;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
    }
    .stat-box h3 {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
      color: #666;
    }
    .stat-box p {
      margin: 5px 0 0;
      font-size: 24px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
    }
    .chart-container {
      height: 300px;
      margin-top: 20px;
    }
    .progress-bar {
      height: 20px;
      background-color: #e9ecef;
      border-radius: 5px;
      margin-top: 5px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background-color: #007bff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      transition: width 0.5s;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
</head>
<body>
  <div class="header">
    <h1>ChasquiFX Cache Dashboard</h1>
    <p>Generated on ${formatDate(data.generatedAt)}</p>
  </div>
  
  <div class="card">
    <h2>Database Overview</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <h3>Total Documents</h3>
        <p>${data.databaseStats.totalDocuments.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Data Size</h3>
        <p>${formatBytes(data.databaseStats.dataSize)}</p>
      </div>
      <div class="stat-box">
        <h3>Storage Size</h3>
        <p>${formatBytes(data.databaseStats.storageSize)}</p>
      </div>
      <div class="stat-box">
        <h3>Collections</h3>
        <p>${data.databaseStats.totalCollections}</p>
      </div>
    </div>
  </div>
  
  <div class="card">
    <h2>Forex Cache</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <h3>Total Documents</h3>
        <p>${data.cacheStats.forex.total.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Active Documents</h3>
        <p>${data.cacheStats.forex.active.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Expired Documents</h3>
        <p>${data.cacheStats.forex.expired.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Avg Document Size</h3>
        <p>${formatBytes(data.cacheStats.forex.averageDocumentSize)}</p>
      </div>
    </div>
    
    <h3>Cache Hit Rate</h3>
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: ${formatPercentage(data.cacheStats.forex.hitRate)}">
        ${formatPercentage(data.cacheStats.forex.hitRate)}
      </div>
    </div>
    
    <h3>Document Timeline</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Cache Key</th>
        <th>Imported At</th>
        <th>Expires At</th>
      </tr>
      <tr>
        <td>Oldest Document</td>
        <td>${data.cacheStats.forex.oldestDocument?.cacheKey || 'N/A'}</td>
        <td>${formatDate(data.cacheStats.forex.oldestDocument?.importedAt)}</td>
        <td>${formatDate(data.cacheStats.forex.oldestDocument?.expiresAt)}</td>
      </tr>
      <tr>
        <td>Newest Document</td>
        <td>${data.cacheStats.forex.newestDocument?.cacheKey || 'N/A'}</td>
        <td>${formatDate(data.cacheStats.forex.newestDocument?.importedAt)}</td>
        <td>${formatDate(data.cacheStats.forex.newestDocument?.expiresAt)}</td>
      </tr>
    </table>
  </div>
  
  <div class="card">
    <h2>Flight Cache</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <h3>Total Documents</h3>
        <p>${data.cacheStats.flights.total.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Active Documents</h3>
        <p>${data.cacheStats.flights.active.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Expired Documents</h3>
        <p>${data.cacheStats.flights.expired.toLocaleString()}</p>
      </div>
      <div class="stat-box">
        <h3>Avg Document Size</h3>
        <p>${formatBytes(data.cacheStats.flights.averageDocumentSize)}</p>
      </div>
    </div>
    
    <h3>Cache Hit Rate</h3>
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: ${formatPercentage(data.cacheStats.flights.hitRate)}">
        ${formatPercentage(data.cacheStats.flights.hitRate)}
      </div>
    </div>
    
    <h3>Document Timeline</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Cache Key</th>
        <th>Imported At</th>
        <th>Expires At</th>
      </tr>
      <tr>
        <td>Oldest Document</td>
        <td>${data.cacheStats.flights.oldestDocument?.cacheKey || 'N/A'}</td>
        <td>${formatDate(data.cacheStats.flights.oldestDocument?.importedAt)}</td>
        <td>${formatDate(data.cacheStats.flights.oldestDocument?.expiresAt)}</td>
      </tr>
      <tr>
        <td>Newest Document</td>
        <td>${data.cacheStats.flights.newestDocument?.cacheKey || 'N/A'}</td>
        <td>${formatDate(data.cacheStats.flights.newestDocument?.importedAt)}</td>
        <td>${formatDate(data.cacheStats.flights.newestDocument?.expiresAt)}</td>
      </tr>
    </table>
  </div>
  
  <div class="card">
    <h2>API Call Statistics</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <h3>Total API Calls</h3>
        <p>${data.apiCalls.total.toLocaleString()}</p>
      </div>
    </div>
    
    <h3>API Calls by Endpoint</h3>
    <table>
      <tr>
        <th>Endpoint</th>
        <th>Count</th>
        <th>Average Status</th>
      </tr>
      ${data.apiCalls.byEndpoint.map(endpoint => `
      <tr>
        <td>${endpoint._id}</td>
        <td>${endpoint.count.toLocaleString()}</td>
        <td>${endpoint.averageStatus.toFixed(2)}</td>
      </tr>
      `).join('')}
    </table>
    
    <h3>API Calls by Day</h3>
    <div class="chart-container">
      <canvas id="apiCallsChart"></canvas>
    </div>
  </div>

  <div class="footer">
    <p>ChasquiFX Cache Dashboard | MongoDB Integration | &copy; 2025</p>
  </div>
  
  <script>
    // Chart for API calls by day
    const apiCallCtx = document.getElementById('apiCallsChart').getContext('2d');
    new Chart(apiCallCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(data.apiCalls.byDay.map(day => day.date))},
        datasets: [{
          label: 'API Calls',
          data: ${JSON.stringify(data.apiCalls.byDay.map(day => day.count))},
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Daily API Call Volume'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Generating cache dashboard...');
    
    // Generate dashboard data
    const dashboardData = await generateDashboardData();
    
    // Output format
    if (outputHtml) {
      const htmlContent = generateHtmlDashboard(dashboardData);
      await fs.writeFile(outputPath, htmlContent, 'utf8');
      console.log(`HTML dashboard written to ${outputPath}`);
    } else {
      await fs.writeFile(outputPath, JSON.stringify(dashboardData, null, 2), 'utf8');
      console.log(`JSON dashboard written to ${outputPath}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`Dashboard generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the generator
main();
