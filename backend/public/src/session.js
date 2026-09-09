// Stored user details are only for display; the server checks the session.
async function loadSession() {
    try {
        const response = await fetch('/me');
        if (!response.ok) throw new Error('Session expired');
        const { user } = await response.json();
        if (location.pathname.endsWith('admin_dashboard.html') && user.Role !== 'admin') {
            location.href = 'dashboard.html';
            return;
        }
        localStorage.setItem('currentUser', user.Username);
        localStorage.setItem('userRole', user.Role);
        localStorage.setItem('userInfo', JSON.stringify(user));
    } catch (err) {
        localStorage.clear();
        location.href = 'login.html';
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        if (!response.ok) throw new Error('Logout failed');
        localStorage.clear();
        location.href = 'login.html';
    } catch (err) { alert('Could not log out. Please try again.'); }
}

// Use for database values inserted into HTML templates.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

loadSession();
