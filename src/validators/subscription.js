const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;


function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
}

function validateRepo(repo) {
    if (!repo || typeof repo !== 'string') {
        return { valid: false, error: 'Repository is required' };
    }
    if (!REPO_REGEX.test(repo.trim())) {
        return { valid: false, error: 'Invalid repository format. Expected owner/repo (e.g. facebook/react)' };
    }
    return { valid: true };
}

function validateToken(token) {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return { valid: false, error: 'Token is required' };
    }
    return { valid: true };
}

module.exports = { validateEmail, validateRepo, validateToken };