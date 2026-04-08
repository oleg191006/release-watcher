const { v4: uuidv4 } = require('uuid');
const subscriptionRepo = require('@/repositories/subscriptionRepository');
const githubService = require('./githubService');
const emailService = require('./emailService');
const { validateEmail, validateRepo, validateToken } = require('@/validators/subscription');

async function subscribe(email, repo) {

    const emailCheck = validateEmail(email);

    if (!emailCheck.valid) {
        const err = new Error(emailCheck.error);
        err.statusCode = 400;
        err.expose = true;
        throw err;
    }

    const repoCheck = validateRepo(repo);

    if (!repoCheck.valid) {
        const err = new Error(repoCheck.error);
        err.statusCode = 400;
        err.expose = true;
        throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRepo = repo.trim();

    const existing = await subscriptionRepo.findByEmailAndRepo(normalizedEmail, normalizedRepo);

    if (existing) {
        const err = new Error('Email already subscribed to this repository');
        err.statusCode = 409;
        err.expose = true;
        throw err;
    }


    const repoExists = await githubService.checkRepoExists(normalizedRepo);

    if (!repoExists) {
        const err = new Error('Repository not found on GitHub');
        err.statusCode = 404;
        err.expose = true;
        throw err;
    }

    const latestRelease = await githubService.getLatestRelease(normalizedRepo);
    const lastSeenTag = latestRelease ? latestRelease.tag : null;

    const confirmToken = uuidv4();
    const unsubscribeToken = uuidv4();

    await subscriptionRepo.create({
        email: normalizedEmail,
        repo: normalizedRepo,
        confirmToken,
        unsubscribeToken,
        lastSeenTag,
    });

    await emailService.sendConfirmationEmail(normalizedEmail, normalizedRepo, confirmToken);

    return { message: 'Subscription successful. Confirmation email sent.' };
}

async function confirmSubscription(token) {
    const tokenCheck = validateToken(token);

    if (!tokenCheck.valid) {
        const err = new Error(tokenCheck.error);
        err.statusCode = 400;
        err.expose = true;
        throw err;
    }

    const subscription = await subscriptionRepo.findByConfirmToken(token);

    if (!subscription) {
        const err = new Error('Token not found');
        err.statusCode = 404;
        err.expose = true;
        throw err;
    }

    if (subscription.confirmed) {
        return { message: 'Subscription already confirmed' };
    }

    await subscriptionRepo.confirm(subscription.id);

    return { message: 'Subscription confirmed successfully' };
}

async function unsubscribe(token) {
    const tokenCheck = validateToken(token);

    if (!tokenCheck.valid) {
        const err = new Error(tokenCheck.error);
        err.statusCode = 400;
        err.expose = true;
        throw err;
    }

    const subscription = await subscriptionRepo.findByUnsubscribeToken(token);

    if (!subscription) {
        const err = new Error('Token not found');
        err.statusCode = 404;
        err.expose = true;
        throw err;
    }

    await subscriptionRepo.remove(subscription.id);

    return { message: 'Unsubscribed successfully' };
}

async function getSubscriptions(email) {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        const err = new Error(emailCheck.error);
        err.statusCode = 400;
        err.expose = true;
        throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const subs = await subscriptionRepo.findAllByEmail(normalizedEmail);

    return subs.map((s) => ({
        email: s.email,
        repo: s.repo,
        confirmed: s.confirmed,
        last_seen_tag: s.last_seen_tag,
    }));
}

module.exports = { subscribe, confirmSubscription, unsubscribe, getSubscriptions };
