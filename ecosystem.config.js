module.exports = {
  apps: [
    {
      name: 'whoispy',
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      instances: 1, // 由于使用了 Socket.io，建议先保持 1 个实例，除非配置了 Redis Adapter
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
