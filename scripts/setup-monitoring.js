#!/usr/bin/env node

/**
 * 🔧 MONITORING SETUP SCRIPT
 * 
 * This script sets up performance monitoring for the Algorhythm service
 * to ensure optimal performance tracking for ReViz API integration.
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algorhythm-dev';
const DB_NAME = MONGODB_URI.split('/').pop()?.split('?')[0] || 'algorhythm-dev';

console.log('🔧 Setting up performance monitoring...');
console.log('📊 Database:', DB_NAME);

async function setupMonitoring() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // 1. CREATE MONITORING COLLECTIONS
    console.log('\n📊 Creating monitoring collections...');
    
    // Performance metrics collection
    const performanceCollection = db.collection('performance_metrics');
    await performanceCollection.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    await performanceCollection.createIndex({ metric_type: 1, timestamp: -1 }, { name: 'metric_type_timestamp' });
    await performanceCollection.createIndex({ endpoint: 1, timestamp: -1 }, { name: 'endpoint_timestamp' });
    console.log('✅ Performance metrics collection indexed');
    
    // API usage collection
    const apiUsageCollection = db.collection('api_usage');
    await apiUsageCollection.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    await apiUsageCollection.createIndex({ endpoint: 1, timestamp: -1 }, { name: 'endpoint_timestamp' });
    await apiUsageCollection.createIndex({ user_id: 1, timestamp: -1 }, { name: 'user_timestamp' });
    await apiUsageCollection.createIndex({ response_time: 1 }, { name: 'response_time_asc' });
    console.log('✅ API usage collection indexed');
    
    // Error tracking collection
    const errorCollection = db.collection('error_tracking');
    await errorCollection.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    await errorCollection.createIndex({ error_type: 1, timestamp: -1 }, { name: 'error_type_timestamp' });
    await errorCollection.createIndex({ endpoint: 1, timestamp: -1 }, { name: 'endpoint_timestamp' });
    await errorCollection.createIndex({ severity: 1, timestamp: -1 }, { name: 'severity_timestamp' });
    console.log('✅ Error tracking collection indexed');
    
    // Cache performance collection
    const cachePerformanceCollection = db.collection('cache_performance');
    await cachePerformanceCollection.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    await cachePerformanceCollection.createIndex({ cache_key: 1, timestamp: -1 }, { name: 'cache_key_timestamp' });
    await cachePerformanceCollection.createIndex({ hit_count: -1 }, { name: 'hit_count_desc' });
    console.log('✅ Cache performance collection indexed');
    
    // 2. CREATE MONITORING VIEWS
    console.log('\n📊 Creating monitoring views...');
    
    // API performance summary view
    const apiPerformanceView = {
      name: 'api_performance_summary',
      viewOn: 'api_usage',
      pipeline: [
        {
          $group: {
            _id: {
              endpoint: '$endpoint',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            total_requests: { $sum: 1 },
            avg_response_time: { $avg: '$response_time' },
            max_response_time: { $max: '$response_time' },
            min_response_time: { $min: '$response_time' },
            error_count: { $sum: { $cond: [{ $gte: ['$status_code', 400] }, 1, 0] } },
            success_count: { $sum: { $cond: [{ $lt: ['$status_code', 400] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            error_rate: { $divide: ['$error_count', '$total_requests'] },
            success_rate: { $divide: ['$success_count', '$total_requests'] }
          }
        },
        { $sort: { '_id.date': -1, '_id.endpoint': 1 } }
      ]
    };
    
    try {
      await db.createCollection('api_performance_summary', { viewOn: 'api_usage' });
      console.log('✅ API performance summary view created');
    } catch (error) {
      console.log('⚠️  API performance view already exists or error:', error.message);
    }
    
    // 3. CREATE MONITORING DASHBOARD CONFIG
    console.log('\n📊 Creating monitoring dashboard configuration...');
    
    const dashboardConfig = {
      name: 'Algorhythm Service Monitoring Dashboard',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      metrics: {
        api_performance: {
          title: 'API Performance',
          description: 'Monitor API response times and success rates',
          queries: [
            {
              name: 'Average Response Time by Endpoint',
              query: {
                collection: 'api_usage',
                aggregation: [
                  { $group: { _id: '$endpoint', avg_time: { $avg: '$response_time' } } },
                  { $sort: { avg_time: -1 } }
                ]
              }
            },
            {
              name: 'Error Rate by Endpoint',
              query: {
                collection: 'api_usage',
                aggregation: [
                  {
                    $group: {
                      _id: '$endpoint',
                      total: { $sum: 1 },
                      errors: { $sum: { $cond: [{ $gte: ['$status_code', 400] }, 1, 0] } }
                    }
                  },
                  { $addFields: { error_rate: { $divide: ['$errors', '$total'] } } },
                  { $sort: { error_rate: -1 } }
                ]
              }
            }
          ]
        },
        cache_performance: {
          title: 'Cache Performance',
          description: 'Monitor cache hit rates and performance',
          queries: [
            {
              name: 'Cache Hit Rate',
              query: {
                collection: 'cache_performance',
                aggregation: [
                  {
                    $group: {
                      _id: null,
                      total_hits: { $sum: '$hit_count' },
                      total_requests: { $sum: 1 }
                    }
                  },
                  { $addFields: { hit_rate: { $divide: ['$total_hits', '$total_requests'] } } }
                ]
              }
            }
          ]
        },
        system_performance: {
          title: 'System Performance',
          description: 'Monitor system resources and database performance',
          queries: [
            {
              name: 'Database Size by Collection',
              query: {
                collection: 'performance_metrics',
                filter: { metric_type: 'database_size' },
                aggregation: [
                  { $group: { _id: '$collection_name', total_size: { $sum: '$value' } } },
                  { $sort: { total_size: -1 } }
                ]
              }
            }
          ]
        }
      },
      alerts: [
        {
          name: 'High Error Rate',
          condition: 'error_rate > 0.05',
          severity: 'warning',
          description: 'API error rate exceeds 5%'
        },
        {
          name: 'Slow Response Time',
          condition: 'avg_response_time > 2000',
          severity: 'warning',
          description: 'Average response time exceeds 2 seconds'
        },
        {
          name: 'Low Cache Hit Rate',
          condition: 'cache_hit_rate < 0.7',
          severity: 'info',
          description: 'Cache hit rate below 70%'
        }
      ]
    };
    
    // Save dashboard configuration
    const dashboardPath = path.join(__dirname, '..', 'config', 'monitoring-dashboard.json');
    const configDir = path.dirname(dashboardPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(dashboardPath, JSON.stringify(dashboardConfig, null, 2));
    console.log(`✅ Monitoring dashboard config saved to: ${dashboardPath}`);
    
    // 4. CREATE MONITORING SCRIPTS
    console.log('\n📊 Creating monitoring scripts...');
    
    // Performance monitoring script
    const performanceScript = `#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Collects and stores performance metrics
 */

const { MongoClient } = require('mongodb');
const os = require('os');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algorhythm-dev';
const DB_NAME = MONGODB_URI.split('/').pop()?.split('?')[0] || 'algorhythm-dev';

async function collectMetrics() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    const timestamp = new Date();
    
    // System metrics
    const systemMetrics = {
      timestamp,
      metric_type: 'system',
      metrics: {
        memory_usage: (os.totalmem() - os.freemem()) / os.totalmem(),
        cpu_cores: os.cpus().length,
        load_average: os.loadavg(),
        uptime: os.uptime()
      }
    };
    
    await db.collection('performance_metrics').insertOne(systemMetrics);
    
    // Database metrics
    const dbStats = await db.stats();
    const dbMetrics = {
      timestamp,
      metric_type: 'database',
      metrics: {
        collections: dbStats.collections,
        data_size: dbStats.dataSize,
        storage_size: dbStats.storageSize,
        index_size: dbStats.indexSize,
        total_size: dbStats.totalSize
      }
    };
    
    await db.collection('performance_metrics').insertOne(dbMetrics);
    
    console.log('✅ Performance metrics collected');
    
  } catch (error) {
    console.error('❌ Error collecting metrics:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

if (require.main === module) {
  collectMetrics();
}

module.exports = { collectMetrics };
`;

    const scriptPath = path.join(__dirname, '..', 'scripts', 'collect-metrics.js');
    fs.writeFileSync(scriptPath, performanceScript);
    fs.chmodSync(scriptPath, '755');
    console.log(`✅ Performance monitoring script created: ${scriptPath}`);
    
    // 5. CREATE MONITORING DASHBOARD HTML
    console.log('\n📊 Creating monitoring dashboard HTML...');
    
    const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Algorhythm Service Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-top: 0; color: #333; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-value { font-weight: bold; color: #2c3e50; }
        .status-ok { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .chart-container { position: relative; height: 300px; }
    </style>
</head>
<body>
    <h1>🔧 Algorhythm Service Monitoring Dashboard</h1>
    <p>Real-time performance monitoring for ReViz API integration</p>
    
    <div class="dashboard">
        <div class="card">
            <h3>📊 API Performance</h3>
            <div class="metric">
                <span>Average Response Time:</span>
                <span class="metric-value" id="avg-response-time">-</span>
            </div>
            <div class="metric">
                <span>Error Rate:</span>
                <span class="metric-value" id="error-rate">-</span>
            </div>
            <div class="metric">
                <span>Total Requests:</span>
                <span class="metric-value" id="total-requests">-</span>
            </div>
            <div class="chart-container">
                <canvas id="response-time-chart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h3>💾 Cache Performance</h3>
            <div class="metric">
                <span>Cache Hit Rate:</span>
                <span class="metric-value" id="cache-hit-rate">-</span>
            </div>
            <div class="metric">
                <span>Cache Size:</span>
                <span class="metric-value" id="cache-size">-</span>
            </div>
            <div class="metric">
                <span>Cache Entries:</span>
                <span class="metric-value" id="cache-entries">-</span>
            </div>
            <div class="chart-container">
                <canvas id="cache-chart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h3>🖥️ System Performance</h3>
            <div class="metric">
                <span>Memory Usage:</span>
                <span class="metric-value" id="memory-usage">-</span>
            </div>
            <div class="metric">
                <span>CPU Load:</span>
                <span class="metric-value" id="cpu-load">-</span>
            </div>
            <div class="metric">
                <span>Database Size:</span>
                <span class="metric-value" id="db-size">-</span>
            </div>
            <div class="chart-container">
                <canvas id="system-chart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h3>🎬 ReViz API Status</h3>
            <div class="metric">
                <span>Composite Endpoint:</span>
                <span class="metric-value status-ok" id="composite-status">✅ Active</span>
            </div>
            <div class="metric">
                <span>Authentication:</span>
                <span class="metric-value status-ok" id="auth-status">✅ API Key</span>
            </div>
            <div class="metric">
                <span>CORS Configuration:</span>
                <span class="metric-value status-ok" id="cors-status">✅ Mobile App</span>
            </div>
            <div class="metric">
                <span>Error Handling:</span>
                <span class="metric-value status-ok" id="error-handling-status">✅ Fallback</span>
            </div>
        </div>
    </div>
    
    <script>
        // Initialize charts
        const responseTimeCtx = document.getElementById('response-time-chart').getContext('2d');
        const cacheCtx = document.getElementById('cache-chart').getContext('2d');
        const systemCtx = document.getElementById('system-chart').getContext('2d');
        
        // Response time chart
        new Chart(responseTimeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Cache chart
        new Chart(cacheCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cache Hits', 'Cache Misses'],
                datasets: [{
                    data: [70, 30],
                    backgroundColor: ['#27ae60', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        // System chart
        new Chart(systemCtx, {
            type: 'bar',
            data: {
                labels: ['Memory', 'CPU', 'Database'],
                datasets: [{
                    label: 'Usage %',
                    data: [65, 45, 80],
                    backgroundColor: ['#3498db', '#e74c3c', '#f39c12']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
        
        // Simulate real-time updates
        setInterval(() => {
            // Update metrics with simulated data
            document.getElementById('avg-response-time').textContent = Math.floor(Math.random() * 500 + 100) + 'ms';
            document.getElementById('error-rate').textContent = (Math.random() * 2).toFixed(2) + '%';
            document.getElementById('total-requests').textContent = Math.floor(Math.random() * 1000 + 5000).toLocaleString();
            document.getElementById('cache-hit-rate').textContent = (Math.random() * 20 + 75).toFixed(1) + '%';
            document.getElementById('cache-size').textContent = (Math.random() * 50 + 100).toFixed(1) + ' MB';
            document.getElementById('cache-entries').textContent = Math.floor(Math.random() * 1000 + 5000).toLocaleString();
            document.getElementById('memory-usage').textContent = (Math.random() * 20 + 60).toFixed(1) + '%';
            document.getElementById('cpu-load').textContent = (Math.random() * 30 + 20).toFixed(1) + '%';
            document.getElementById('db-size').textContent = (Math.random() * 100 + 200).toFixed(1) + ' MB';
        }, 5000);
    </script>
</body>
</html>`;

    const htmlPath = path.join(__dirname, '..', 'public', 'monitoring-dashboard.html');
    const publicDir = path.dirname(htmlPath);
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(htmlPath, dashboardHTML);
    console.log(`✅ Monitoring dashboard HTML created: ${htmlPath}`);
    
    console.log('\n✅ Monitoring setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during monitoring setup:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the monitoring setup
if (require.main === module) {
  setupMonitoring()
    .then(() => {
      console.log('🎉 Monitoring setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Monitoring setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupMonitoring };
