const nodemailer = require('nodemailer');
const config = require('@/config');
const logger = require('@/utils/logger');

let transporter;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            tls: {
                rejectUnauthorized: config.smtp.rejectUnauthorized,
            },
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
    }
    return transporter;
}


function setTransporter(t) {
    transporter = t;
}

async function sendConfirmationEmail(email, repo, confirmToken) {
    const confirmUrl = `${config.appUrl}/api/confirm/${confirmToken}`;

    const mailOptions = {
        from: config.smtp.from,
        to: email,
        subject: `Confirm your subscription to ${repo} releases`,
        html: `
      <h2>GitHub Release Notifications</h2>
      <p>You have requested to receive release notifications for <strong>${repo}</strong>.</p>
      <p>Please confirm your subscription by clicking the link below:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    };

    try {
        await getTransporter().sendMail(mailOptions);
        logger.info(`Confirmation email sent to ${email} for repo ${repo}`);
    } catch (err) {
        logger.error(`Failed to send confirmation email to ${email}`, err);
        throw err;
    }
}

async function sendReleaseNotification(email, repo, release, unsubscribeToken) {
    const unsubscribeUrl = `${config.appUrl}/api/unsubscribe/${unsubscribeToken}`;

    const mailOptions = {
        from: config.smtp.from,
        to: email,
        subject: `New release for ${repo}: ${release.tag}`,
        html: `
      <h2>New Release: ${release.name}</h2>
      <p>Repository: <strong>${repo}</strong></p>
      <p>Tag: <strong>${release.tag}</strong></p>
      <p>Published: ${release.publishedAt || 'N/A'}</p>
      <p><a href="${release.url}">View release on GitHub</a></p>
      <hr />
      <p><small>
        <a href="${unsubscribeUrl}">Unsubscribe</a> from notifications for ${repo}.
      </small></p>
    `,
    };

    try {
        await getTransporter().sendMail(mailOptions);
        logger.info(`Release notification sent to ${email} for ${repo}@${release.tag}`);
    } catch (err) {
        logger.error(`Failed to send release notification to ${email}`, err);
        // Do not re-throw — scanner should continue with other subscriptions
    }
}

module.exports = {
    sendConfirmationEmail,
    sendReleaseNotification,
    getTransporter,
    setTransporter,
};
