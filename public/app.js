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
                        <span class="badge ${sub.confirmed ? 'badge-confirmed' : 'badge-pending'}">
                            ${sub.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                        </span>
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

function escapeHtml(value) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(value));
    return div.innerHTML;
}