module.exports = {
  apps: [{
    name: 'hausa-speech-api',
    script: './dist/index.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_file: './.env.production',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Advanced PM2 features
    autorestart: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    // Health monitoring
    health_check_grace_period: 3000,
    // Process management
    kill_retry_time: 100,
    // Logging
    log_type: 'json',
    // Environment specific
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 4001
    }
  }]
};
