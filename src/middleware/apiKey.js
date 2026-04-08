const config = require('@/config');

function apiKeyAuth(req, res, next) {

    if (!config.apiKey) {
        return next();
    }

    const provided = req.headers['x-api-key'];

    if (!provided) {
        return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    if (provided !== config.apiKey) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    return next();
}

module.exports = apiKeyAuth;
