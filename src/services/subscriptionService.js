const { v4: uuidv4 } = require('uuid');
const subscriptionRepo = require('@/repositories/subscriptionRepository');
const githubService = require('./githubService');
const emailService = require('./emailService');
const config = require('@/config');
const { validateEmail, validateRepo, validateToken } = require('@/validators/subscription');
const logger = require('@/utils/logger');

function createError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true;
    return err;
}

function assertValid(check) {
    if (!check.valid) throw createError(check.error, 400);
}

async function subscribe(email, repo) {
    assertValid(validateEmail(email));
    assertValid(validateRepo(repo));

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRepo = repo.trim();

    const existing = await subscriptionRepo.findByEmailAndRepo(normalizedEmail, normalizedRepo);
    if (existing) throw createError('Email already subscribed to this repository', 409);

    const repoExists = await githubService.checkRepoExists(normalizedRepo);
    if (!repoExists) throw createError('Repository not found on GitHub', 404);

    const latestRelease = await githubService.getLatestRelease(normalizedRepo);
    const lastSeenTag = latestRelease ? latestRelease.tag : null;

    const confirmToken = uuidv4();
    const unsubscribeToken = uuidv4();

    const created = await subscriptionRepo.create({
        email: normalizedEmail,
        repo: normalizedRepo,
        confirmToken,
        unsubscribeToken,
        lastSeenTag,
    });

    try {
        await emailService.sendConfirmationEmail(normalizedEmail, normalizedRepo, confirmToken, unsubscribeToken);
    } catch (err) {
        try {
            await subscriptionRepo.remove(created.id);
        } catch (rollbackErr) {
            logger.error('Failed to rollback subscription after email send error', rollbackErr);
        }

        const emailConfigured = Boolean(config.resend.apiKey || (config.smtp.user && config.smtp.pass));
        const message = emailConfigured
            ? 'Failed to send confirmation email. Please try again later.'
            : 'Email service is not configured on server. Please configure SMTP or Resend settings.';

        throw createError(message, 503);
    }

    return { message: 'Subscription successful. Confirmation email sent.' };
}

async function confirmSubscription(token) {
    assertValid(validateToken(token));

    const subscription = await subscriptionRepo.findByConfirmToken(token);
    if (!subscription) throw createError('Token not found', 404);

    if (subscription.confirmed) {
        return { message: 'Subscription already confirmed' };
    }

    await subscriptionRepo.confirm(subscription.id);
    return { message: 'Subscription confirmed successfully' };
}

async function unsubscribe(token) {
    assertValid(validateToken(token));

    const subscription = await subscriptionRepo.findByUnsubscribeToken(token);
    if (!subscription) throw createError('Token not found', 404);

    if (!subscription.confirmed) {
        throw createError('Subscription is not confirmed yet', 409);
    }

    await subscriptionRepo.remove(subscription.id);
    return { message: 'Unsubscribed successfully' };
}

async function getSubscriptions(email) {
    assertValid(validateEmail(email));

    const normalizedEmail = email.trim().toLowerCase();
    const subs = await subscriptionRepo.findAllByEmail(normalizedEmail);

    return subs.map((s) => ({
        email: s.email,
        repo: s.repo,
        confirmed: s.confirmed,
        last_seen_tag: s.last_seen_tag,
    }));
}

module.exports = {
    subscribe,
    confirmSubscription,
    unsubscribe,
    getSubscriptions,
};
