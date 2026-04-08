const subscriptionRepository = require('@/repositories/subscriptionRepository');

async function subscribe(email, repo) {
    const existing = await subscriptionRepository.findByEmailAndRepo(email, repo);
    if (existing) {
        return {
            message: 'Subscription already exists',
            subscription: existing,
        };
    }

    return {
        message: 'Subscription service is connected. Complete implementation in progress.',
        email,
        repo,
    };
}

async function confirmSubscription(token) {
    return {
        message: 'Confirmation endpoint is wired',
        token,
    };
}

async function unsubscribe(token) {
    return {
        message: 'Unsubscribe endpoint is wired',
        token,
    };
}

async function getSubscriptions(email) {
    const subscriptions = await subscriptionRepository.findAllByEmail(email);
    return {
        email,
        subscriptions,
    };
}

module.exports = {
    subscribe,
    confirmSubscription,
    unsubscribe,
    getSubscriptions,
};
