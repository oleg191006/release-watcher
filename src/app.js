const express = require('express');

function createApp() {
    const app = express();

    app.use(express.json());

    app.get('/', (_req, res) => {
        res.status(200).json({
            message: 'Release Watcher API is running',
        });
    });

    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
        });
    });

    return app;
}

module.exports = {
    createApp,
};
