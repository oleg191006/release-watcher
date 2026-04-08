const API_BASE = window.location.origin + '/api';

document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.panel).classList.add('active');
    });
});

function showAlert(element, type, message) {
    element.className = `alert show alert-${type}`;
    element.textContent = message;
}

function hideAlert(element) {
    element.className = 'alert';
    element.textContent = '';
}

function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button._originalText = button.textContent;
        button.innerHTML = '<span class="spinner"></span> Loading...';
        return;
    }

    button.disabled = false;
    button.textContent = button._originalText || button.textContent;
}

function getHeaders(apiKeyInputId) {
    const headers = { 'Content-Type': 'application/json' };
    const primaryKey = document.getElementById(apiKeyInputId)?.value?.trim();
    const fallbackId = apiKeyInputId === 'api-key' ? 'lookup-api-key' : 'api-key';
    const fallbackKey = document.getElementById(fallbackId)?.value?.trim();
    const key = primaryKey || fallbackKey;

    if (key) {
        headers['X-API-Key'] = key;
    }

    return headers;
}

function syncApiKeyInputs() {
    const subscribeKeyInput = document.getElementById('api-key');
    const lookupKeyInput = document.getElementById('lookup-api-key');

    if (!subscribeKeyInput || !lookupKeyInput) {
        return;
    }

    subscribeKeyInput.addEventListener('input', () => {
        lookupKeyInput.value = subscribeKeyInput.value;
    });

    lookupKeyInput.addEventListener('input', () => {
        subscribeKeyInput.value = lookupKeyInput.value;
    });
}

syncApiKeyInputs();

const unsubscribeModal = createUnsubscribeModalController({
    modal: document.getElementById('unsubscribe-modal'),
    repoLabel: document.getElementById('unsubscribe-modal-repo'),
    tokenInput: document.getElementById('unsubscribe-token-input'),
    confirmButton: document.getElementById('unsubscribe-confirm-btn'),
    cancelButton: document.getElementById('unsubscribe-cancel-btn'),
});

function renderSubscriptions(listElement, subscriptions) {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        listElement.innerHTML = '<div class="empty-state">No subscriptions found 🤷</div>';
        return;
    }

    listElement.innerHTML = '';
    subscriptions.forEach((sub) => {
        const item = document.createElement('li');
        item.className = 'sub-item';
        item.innerHTML = `
                        <div>
                            <span class="repo">${escapeHtml(sub.repo)}</span>
                            <div class="tag">${sub.last_seen_tag ? 'Last release: ' + escapeHtml(sub.last_seen_tag) : 'No releases yet'}</div>
                        </div>
                        <div class="sub-actions">
                            <span class="badge ${sub.confirmed ? 'badge-confirmed' : 'badge-pending'}">
                                ${sub.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                            </span>
                            <button type="button" class="btn btn-danger btn-unsubscribe" data-repo="${encodeURIComponent(sub.repo)}">
                                Unsubscribe
                            </button>
                        </div>
                    `;
        listElement.appendChild(item);
    });
}

document.getElementById('subscribe-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const alertElement = document.getElementById('subscribe-alert');
    const button = document.getElementById('subscribe-btn');
    hideAlert(alertElement);

    const email = document.getElementById('email').value.trim();
    const repo = document.getElementById('repo').value.trim();

    if (!email || !repo) {
        showAlert(alertElement, 'error', 'Please fill in all fields');
        return;
    }

    setLoading(button, true);

    try {
        const response = await fetch(`${API_BASE}/subscribe`, {
            method: 'POST',
            headers: getHeaders('api-key'),
            body: JSON.stringify({ email, repo }),
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            showAlert(alertElement, 'success', data.message || 'Subscription created! Check your email to confirm.');
            document.getElementById('subscribe-form').reset();
        } else if (response.status === 409) {
            showAlert(alertElement, 'warning', data.error || 'You are already subscribed to this repository.');
        } else {
            showAlert(alertElement, 'error', data.error || `Error: ${response.status}`);
        }
    } catch (_error) {
        showAlert(alertElement, 'error', 'Failed to connect to the server.');
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('lookup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const alertElement = document.getElementById('lookup-alert');
    const button = document.getElementById('lookup-btn');
    const listElement = document.getElementById('sub-list');

    hideAlert(alertElement);
    listElement.innerHTML = '';

    const email = document.getElementById('lookup-email').value.trim();
    if (!email) {
        showAlert(alertElement, 'error', 'Please enter your email');
        return;
    }

    setLoading(button, true);

    try {
        const response = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`, {
            headers: getHeaders('lookup-api-key'),
        });
        const data = await response.json().catch(() => []);

        if (!response.ok) {
            showAlert(alertElement, 'error', data.error || `Error: ${response.status}`);
            return;
        }

        renderSubscriptions(listElement, data);
    } catch (_error) {
        showAlert(alertElement, 'error', 'Failed to connect to the server.');
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('sub-list').addEventListener('click', async (event) => {
    const button = event.target.closest('.btn-unsubscribe');
    if (!button) {
        return;
    }

    const listElement = document.getElementById('sub-list');
    const alertElement = document.getElementById('lookup-alert');
    const email = document.getElementById('lookup-email').value.trim();
    const repo = decodeURIComponent(button.dataset.repo || '');

    if (!email || !repo) {
        showAlert(alertElement, 'error', 'Please load subscriptions first.');
        return;
    }

    hideAlert(alertElement);

    const tokenInput = await unsubscribeModal.open(repo);
    const token = normalizeUnsubscribeToken(tokenInput);
    if (!token) {
        showAlert(alertElement, 'warning', 'Unsubscribe canceled. Token is required.');
        return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Removing...';

    try {
        const response = await fetch(`${API_BASE}/unsubscribe/${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: getHeaders('lookup-api-key'),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 404) {
                showAlert(alertElement, 'error', 'Token not found. Copy the Unsubscribe token from your email and try again.');
                return;
            }
            showAlert(alertElement, 'error', data.error || `Error: ${response.status}`);
            return;
        }

        showAlert(alertElement, 'success', data.message || 'Unsubscribed successfully.');
        const refreshResponse = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`, {
            headers: getHeaders('lookup-api-key'),
        });
        const refreshed = await refreshResponse.json().catch(() => []);
        if (refreshResponse.ok) {
            renderSubscriptions(listElement, refreshed);
        }
    } catch (_error) {
        showAlert(alertElement, 'error', 'Failed to connect to the server.');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

function escapeHtml(value) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(value));
    return div.innerHTML;
}

function normalizeUnsubscribeToken(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
        return '';
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return '';
    }

    if (!/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        const segments = url.pathname.split('/').filter(Boolean);
        return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : '';
    } catch (_error) {
        return trimmed;
    }
}

function createUnsubscribeModalController(elements) {
    const {
        modal,
        repoLabel,
        tokenInput,
        confirmButton,
        cancelButton,
    } = elements;

    let resolver = null;

    if (!modal || !repoLabel || !tokenInput || !confirmButton || !cancelButton) {
        return {
            open: async () => null,
        };
    }

    const close = (value = null) => {
        if (!resolver) {
            return;
        }

        const nextResolve = resolver;
        resolver = null;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        tokenInput.value = '';
        nextResolve(value);
    };

    confirmButton.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        close(token || null);
    });

    cancelButton.addEventListener('click', () => close());

    modal.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.closeModal === 'true') {
            close();
        }
    });

    tokenInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmButton.click();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && resolver) {
            close();
        }
    });

    return {
        open: (repo) => new Promise((resolve) => {
            if (resolver) {
                resolver(null);
            }

            resolver = resolve;
            repoLabel.textContent = `Repository: ${repo}`;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            tokenInput.focus();
        }),
    };
}