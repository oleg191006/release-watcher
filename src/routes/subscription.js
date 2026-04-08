const { Router } = require('express');
const subscriptionService = require('@/services/subscriptionService');

const router = Router();

router.post('/subscribe', async (req, res, next) => {
    try {
        const { email, repo } = req.body;
        const result = await subscriptionService.subscribe(email, repo);
        return res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
});

router.get('/confirm/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        const result = await subscriptionService.confirmSubscription(token);
        return res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
});

router.get('/unsubscribe/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        const result = await subscriptionService.unsubscribe(token);
        return res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
});

router.get('/subscriptions', async (req, res, next) => {
    try {
        const { email } = req.query;
        const result = await subscriptionService.getSubscriptions(email);
        return res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;