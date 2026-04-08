const axios = require('axios');
const config = require('@/config');
const logger = require('@/utils/logger');


function createClient() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'notificator-app',
    };

    if (config.github.token) {
        headers.Authorization = `Bearer ${config.github.token}`;
    }

    return axios.create({
        baseURL: config.github.apiBase,
        timeout: 10000,
        headers,
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (err.response && err.response.status === 429) {
                const raw = parseInt(err.response.headers['retry-after'], 10);
                const retryAfter = Number.isFinite(raw) && raw > 0 ? raw : 60;
                logger.warn(`GitHub API rate limit hit. Retry-After: ${retryAfter}s (attempt ${attempt + 1}/${maxRetries + 1})`);

                if (attempt < maxRetries) {
                    await module.exports.sleep(retryAfter * 1000);
                    continue;
                }
            }
            throw err;
        }
    }
}

async function checkRepoExists(repo) {
    const client = createClient();
    try {
        await withRateLimitRetry(() => client.get(`/repos/${repo}`));
        return true;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return false;
        }
        if (err.response && err.response.status === 429) {
            logger.error('GitHub rate limit exceeded after retries');
            const error = new Error('GitHub API rate limit exceeded. Please try again later.');
            error.statusCode = 503;
            error.expose = true;
            throw error;
        }
        logger.error('GitHub API error while checking repo', err.message);
        throw err;
    }
}

async function getLatestRelease(repo) {
    const client = createClient();
    try {
        const { data } = await withRateLimitRetry(() => client.get(`/repos/${repo}/releases/latest`));
        return {
            tag: data.tag_name,
            name: data.name || data.tag_name,
            url: data.html_url,
            publishedAt: data.published_at,
        };
    } catch (err) {
        if (err.response && err.response.status === 404) {
            // No releases for this repo
            return null;
        }
        if (err.response && err.response.status === 429) {
            logger.error('GitHub rate limit exceeded after retries for releases');
            return null;
        }
        logger.error(`Error fetching latest release for ${repo}`, err.message);
        return null;
    }
}

module.exports = { checkRepoExists, getLatestRelease, createClient, withRateLimitRetry, sleep };
