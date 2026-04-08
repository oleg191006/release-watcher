require('dotenv').config();

const config = {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    apiKey: process.env.API_KEY || '',

    db: {
        connectionString: process.env.DATABASE_URL || '',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'notificator',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DATABASE_URL
            ? { rejectUnauthorized: false }
            : false,
    },

    github: {
        token: process.env.GITHUB_TOKEN || '',
        apiBase: 'https://api.github.com',
    },

    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
        connectionTimeoutMs: parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 10) || 10000,
        greetingTimeoutMs: parseInt(process.env.SMTP_GREETING_TIMEOUT_MS, 10) || 10000,
        socketTimeoutMs: parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 10) || 15000,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.EMAIL_FROM || 'GitHub Notificator <noreply@notificator.app>',
    },

    scanner: {
        cron: process.env.SCAN_CRON || '*/10 * * * *',
    },

    appUrl: process.env.APP_URL || 'http://localhost:3000',
};

module.exports = config;
