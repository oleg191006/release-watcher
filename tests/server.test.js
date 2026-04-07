const request = require('supertest');
const { createApp } = require('../src/app');

describe('Default server routes', () => {
    const app = createApp();

    it('GET / should return welcome message', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            message: 'Release Watcher API is running',
        });
    });

    it('GET /health should return service status', async () => {
        const response = await request(app).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            status: 'ok',
        });
        expect(typeof response.body.uptime).toBe('number');
    });
});
