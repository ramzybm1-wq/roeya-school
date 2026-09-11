/**
 * VISION SCHOOL Admin Console Application Controller v2.0
 * Pure Antigravity Frontend Architecture
 * Decoupled from Stitch, strictly connected to real backend endpoints.
 */

const API_BASE = '/api';

// ── Branding & Media Helpers ──
function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const host = API_BASE.replace(/\/api\/?$/, '');
  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
}

function applyAdminBranding(b) {
  if (!b) return;
  const brandName = b.platformName || b.siteName || 'ROEYA SCHOOL';

  // 1. Text branding across sidebar, header, auth pages
  const brandElements = document.querySelectorAll('#admin-brand-name, .sidebar-brand-name, .auth-logo-name, [data-brand-name]');
  brandElements.forEach(el => {
    el.textContent = brandName;
  });

  // 2. Icon / Logo branding
  const adminLogoUrl = b.adminLogoUrl || b.clientLogoUrl;
  const brandIcons = document.querySelectorAll('#admin-brand-icon, .sidebar-brand-icon');
  brandIcons.forEach(iconEl => {
    if (adminLogoUrl) {
      iconEl.innerHTML = `<img src="${resolveMediaUrl(adminLogoUrl)}" alt="${brandName}" style="max-height:100%;max-width:100%;object-fit:contain;border-radius:inherit;display:block;" />`;
    } else {
      iconEl.innerHTML = `<span class="material-symbols-outlined">school</span>`;
    }
  });

  const authIcons = document.querySelectorAll('.auth-logo-icon');
  authIcons.forEach(iconEl => {
    if (adminLogoUrl) {
      iconEl.innerHTML = `<img src="${resolveMediaUrl(adminLogoUrl)}" alt="${brandName}" style="max-height:100%;max-width:100%;object-fit:contain;border-radius:inherit;display:block;" />`;
    }
  });

  // 3. Document title
  if (document.title) {
    if (document.title.includes('VISION SCHOOL')) {
      document.title = document.title.replace(/VISION SCHOOL/g, brandName);
    } else if (!document.title.includes(brandName)) {
      const parts = document.title.split('—');
      if (parts.length > 1) {
        document.title = `${parts[0].trim()} — ${brandName} Administration`;
      }
    }
  }

  // 4. Favicon
  if (b.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = resolveMediaUrl(b.faviconUrl);
  }

  // 5. Store in local cache
  try {
    localStorage.setItem('vs_branding_cache', JSON.stringify(b));
  } catch (e) {}
}

async function loadAdminBranding() {
  // Apply cached branding first to eliminate flicker
  try {
    const cached = localStorage.getItem('vs_branding_cache');
    if (cached) {
      applyAdminBranding(JSON.parse(cached));
    }
  } catch (err) {}

  // Fetch live branding
  try {
    const res = await fetch(`${API_BASE}/public/branding?t=${Date.now()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        applyAdminBranding(json.data);
      }
    }
  } catch (err) {
    console.warn('[Branding] Could not fetch live branding:', err);
  }
}

// Cross-tab and client-portal synchronization listener
window.addEventListener('storage', (e) => {
  if (e.key === 'vs_branding_sync' && e.newValue) {
    try {
      applyAdminBranding(JSON.parse(e.newValue));
    } catch (err) {}
  }
});

// ── Auth Storage Helper ──
const AdminAuth = {
  getToken() {
    const local = localStorage.getItem('vs_admin_token');
    if (local) return local;
    const match = document.cookie.match(/(?:^|;\s*)vs_admin_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('vs_admin_user') || 'null');
    } catch {
      return null;
    }
  },
  setSession(token, user, remember = false) {
    localStorage.setItem('vs_admin_token', token);
    localStorage.setItem('vs_admin_user', JSON.stringify(user));
    const maxAge = remember ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
    document.cookie = `vs_admin_session=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  },
  clearSession() {
    localStorage.removeItem('vs_admin_token');
    localStorage.removeItem('vs_admin_user');
    document.cookie = 'vs_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
  },
  isAuthenticated() {
    return !!AdminAuth.getToken();
  }
};

// ── API Fetch with Bearer Auth ──
async function adminFetch(url, options = {}) {
  const token = AdminAuth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      AdminAuth.clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
      throw new Error('Session expirée ou non autorisée.');
    }

    return res.json();
  } catch (err) {
    throw err;
  }
}

// ── Toast Notification Helper ──
function showAdminToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined">${icons[type] || 'info'}</span>
    <div class="toast-msg">${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// ── Formatters ──
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatStatusBadge(status) {
  const map = {
    NEW: { label: 'Nouvelle', cls: 'badge-new' },
    PENDING: { label: 'En attente', cls: 'badge-pending' },
    ACCEPTED: { label: 'Acceptée', cls: 'badge-accepted' },
    REFUSED: { label: 'Refusée', cls: 'badge-refused' },
    WAITLISTED: { label: 'Liste d\'attente', cls: 'badge-waiting' },
    CANCELLED: { label: 'Annulée', cls: 'badge-cancelled' }
  };
  const item = map[status] || { label: status, cls: 'badge-inactive' };
  return `<span class="badge ${item.cls}"><span class="badge-dot"></span>${item.label}</span>`;
}

// ── Real Logout Action ──
async function performLogout() {
  try {
    await adminFetch('/admin/auth/logout', { method: 'POST' });
  } catch (err) {
    // Ignore error
  }
  AdminAuth.clearSession();
  showAdminToast('Déconnexion effectuée avec succès.', 'info');
  setTimeout(() => {
    window.location.href = '/login?logout=1';
  }, 250);
}

// ── Initialize App & Router ──
document.addEventListener('DOMContentLoaded', async () => {
  // Load institutional branding immediately
  loadAdminBranding();

  const path = window.location.pathname;

  // 1. Handle Public Auth Views
  if (path === '/login' || path === '/login/') {
    initLogin();
    return;
  }
  if (path === '/2fa' || path === '/2fa/') {
    init2FA();
    return;
  }
  if (path === '/forgot-password' || path === '/forgot-password/') {
    initForgotPassword();
    return;
  }
  if (path === '/reset-password' || path === '/reset-password/') {
    initResetPassword();
    return;
  }

  // 2. Protect Admin Route
  if (!AdminAuth.isAuthenticated()) {
    window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
    return;
  }

  // 3. Initialize Shared Layout (Sidebar, Topbar, User Profile, Mobile Drawer)
  initSidebarAndHeader();

  // 4. Route to page controller
  if (path === '/dashboard' || path === '/dashboard/') {
    initDashboard();
  } else if (path === '/inscriptions' || path === '/inscriptions/') {
    initInscriptions();
  } else if (path.startsWith('/inscriptions/') && path !== '/inscriptions/nouvelle') {
    initDossierDetail();
  } else if (path === '/inscriptions/nouvelle') {
    initNouvelleInscription();
  } else if (path === '/etablissements') {
    initEtablissements();
  } else if (path === '/niveaux-capacites') {
    initNiveauxCapacites();
  } else if (path === '/annees-scolaires') {
    initAnneesScolaires();
  } else if (path === '/tarifs') {
    initTarifs();
  } else if (path === '/liste-attente') {
    initWaitingList();
  } else if (path === '/documents') {
    initDocuments();
  } else if (path === '/medias') {
    initMedias();
  } else if (path === '/form-builder' || path === '/formulaires') {
    initFormBuilder();
  } else if (path === '/utilisateurs' || path === '/securite') {
    initUtilisateurs();

  } else if (path === '/notifications') {
    initNotifications();
  } else if (path === '/rapports') {
    initRapports();
  } else if (path === '/parametres') {
    initParametres();
  } else if (path === '/profil' || path === '/profile') {
    initParametres('profile');
  }
});

// ── LOGIN PAGE ──
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');
  const rememberCheckbox = document.getElementById('remember-me');
  const errorBox = document.getElementById('login-error');
  const errorMsg = document.getElementById('login-error-message');
  const submitBtn = document.getElementById('btn-login');
  const submitText = document.getElementById('btn-login-text');

  // Password toggle
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPw = passwordInput.type === 'password';
      passwordInput.type = isPw ? 'text' : 'password';
      const icon = document.getElementById('toggle-password-icon');
      if (icon) icon.textContent = isPw ? 'visibility_off' : 'visibility';
    });
  }

  // Pre-fill remembered email
  const remembered = localStorage.getItem('vs_remembered_email');
  if (remembered && emailInput) {
    emailInput.value = remembered;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.classList.add('hidden');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      if (errorBox && errorMsg) {
        errorMsg.textContent = 'Veuillez renseigner votre email et votre mot de passe.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }

    const remember = rememberCheckbox?.checked || false;
    if (remember) {
      localStorage.setItem('vs_remembered_email', email);
    } else {
      localStorage.removeItem('vs_remembered_email');
    }

    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success && data.data) {
        const authData = data.data;
        if (authData.requires2Fa) {
          sessionStorage.setItem('vs_2fa_challenge', authData.challengeToken);
          window.location.href = '/2fa';
          return;
        }

        AdminAuth.setSession(authData.sessionToken, authData.user, remember);
        showAdminToast(`Bienvenue, ${authData.user.firstName} ${authData.user.lastName} !`, 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 300);
      } else {
        const msg = data.error?.message || 'Identifiants de connexion invalides.';
        if (errorBox && errorMsg) {
          errorMsg.textContent = msg;
          errorBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }
    } catch (err) {
      if (errorBox && errorMsg) {
        errorMsg.textContent = 'Erreur de connexion avec le serveur d\'authentification.';
        errorBox.classList.remove('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });
}

// ── 2FA VERIFICATION PAGE ──
function init2FA() {
  const form = document.getElementById('2fa-form');
  if (!form) return;

  const challengeToken = sessionStorage.getItem('vs_2fa_challenge');
  const statusBox = document.getElementById('status-2fa');
  const submitBtn = document.getElementById('btn-2fa-submit');
  const inputs = Array.from(document.querySelectorAll('#code-inputs input'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusBox) statusBox.classList.add('hidden');

    const code = inputs.map(i => i.value.trim()).join('');
    if (code.length !== 6) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Veuillez saisir les 6 chiffres du code de vérification.';
        statusBox.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }

    try {
      const res = await fetch(`${API_BASE}/admin/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code })
      });
      const data = await res.json();
      if (data.success && data.data) {
        sessionStorage.removeItem('vs_2fa_challenge');
        AdminAuth.setSession(data.data.sessionToken, data.data.user);
        showAdminToast('Vérification réussie !', 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 300);
      } else {
        if (statusBox) {
          statusBox.className = 'alert alert-error mb-4';
          statusBox.textContent = data.error?.message || 'Code de vérification invalide ou expiré.';
          statusBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }
    } catch (err) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Erreur lors de la validation du code 2FA.';
        statusBox.classList.remove('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });
}

// ── FORGOT PASSWORD PAGE ──
function initForgotPassword() {
  const form = document.getElementById('forgot-form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const statusBox = document.getElementById('forgot-status');
  const submitBtn = document.getElementById('btn-forgot-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim();
    if (!email) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }

    try {
      const res = await fetch(`${API_BASE}/admin/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (statusBox) {
        statusBox.className = 'alert alert-success mb-4';
        statusBox.textContent = data.data?.message || 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.';
        statusBox.classList.remove('hidden');
      }
    } catch (err) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Erreur lors de l\'envoi de la demande.';
        statusBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });
}

// ── RESET PASSWORD PAGE ──
function initResetPassword() {
  const form = document.getElementById('reset-form');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const pwInput = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const statusBox = document.getElementById('reset-status');
  const submitBtn = document.getElementById('btn-reset-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = pwInput?.value;
    const confirmPassword = confirmInput?.value;

    if (!newPassword || newPassword.length < 8) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Le mot de passe doit comporter au moins 8 caractères.';
        statusBox.classList.remove('hidden');
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Les deux mots de passe ne correspondent pas.';
        statusBox.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }

    try {
      const res = await fetch(`${API_BASE}/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        if (statusBox) {
          statusBox.className = 'alert alert-success mb-4';
          statusBox.textContent = 'Mot de passe réinitialisé avec succès ! Redirection vers la page de connexion...';
          statusBox.classList.remove('hidden');
        }
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        if (statusBox) {
          statusBox.className = 'alert alert-error mb-4';
          statusBox.textContent = data.error?.message || 'Lien expiré ou invalide.';
          statusBox.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (statusBox) {
        statusBox.className = 'alert alert-error mb-4';
        statusBox.textContent = 'Erreur lors de la réinitialisation.';
        statusBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });
}

// ── SIDEBAR & TOPBAR INTERACTIVITY ──

function initSidebarAndHeader() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;

  // 1. Highlight Active Nav Links
  const navLinks = document.querySelectorAll('[data-nav-link]');
  navLinks.forEach(link => {
    const href = link.getAttribute('data-nav-link');
    if (href === currentPath || (href.includes('?') && `${currentPath}${currentSearch}`.startsWith(href))) {
      link.classList.add('active');
      const parentSubmenu = link.closest('.sidebar-submenu');
      if (parentSubmenu) {
        parentSubmenu.classList.add('open');
        const chevron = document.getElementById('nav-inscriptions-chevron');
        if (chevron) chevron.classList.add('open');
      }
    }
  });

  // 2. Submenu Accordion Toggle
  const inscriptionsToggle = document.getElementById('nav-inscriptions-toggle');
  const inscriptionsSubmenu = document.getElementById('nav-inscriptions-submenu');
  const chevron = document.getElementById('nav-inscriptions-chevron');
  if (inscriptionsToggle && inscriptionsSubmenu) {
    inscriptionsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = inscriptionsSubmenu.classList.toggle('open');
      if (chevron) chevron.classList.toggle('open', isOpen);
    });
  }

  // 3. Mobile Sidebar Drawer Toggle
  const mobileBtn = document.getElementById('btn-mobile-sidebar');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  if (mobileBtn && sidebar && overlay) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // 4. Profile Dropdown
  const profileBtn = document.getElementById('btn-topbar-profile');
  const profileMenu = document.getElementById('topbar-profile-menu');
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      profileMenu.classList.remove('open');
    });
  }

  // 5. Logout Buttons
  const logoutBtns = document.querySelectorAll('#btn-sidebar-logout, #btn-topbar-logout');
  logoutBtns.forEach(btn => btn.addEventListener('click', performLogout));

  // 6. User Profile Hydration
  const user = AdminAuth.getUser();
  if (user) updateUserDisplay(user);

  // 7. Load real badge counts
  loadSidebarBadges();
}

function updateUserDisplay(user) {
  document.querySelectorAll('.sidebar-user-name').forEach(el => {
    el.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Administrateur';
  });
  document.querySelectorAll('.sidebar-user-email').forEach(el => {
    el.textContent = user.email || 'admin@visionschool.dz';
  });
  document.querySelectorAll('.sidebar-user-role').forEach(el => {
    const roles = { SUPER_ADMIN: 'Super Administrateur', ADMIN: 'Administrateur', STAFF: 'Agent d\'inscription' };
    el.textContent = roles[user.role] || user.role || 'Personnel';
  });
}

async function loadSidebarBadges() {
  try {
    const res = await adminFetch('/admin/dashboard/metrics');
    if (res.success && res.data) {
      const newCount = res.data.newRegistrations || 0;
      const badge = document.getElementById('sidebar-new-badge');
      if (badge) {
        badge.textContent = String(newCount);
        badge.style.display = newCount > 0 ? 'inline-block' : 'none';
      }
      const notifDot = document.getElementById('topbar-notif-dot');
      if (notifDot) {
        if (newCount > 0) notifDot.classList.remove('hidden');
        else notifDot.classList.add('hidden');
      }
    }
  } catch (err) {
    // Non-critical
  }
}

// ── DASHBOARD REAL METRICS & CHART.JS ──
async function initDashboard() {
  try {
    const [metricsRes, regRes] = await Promise.all([
      adminFetch('/admin/dashboard/metrics'),
      adminFetch('/admin/registrations?limit=6')
    ]);

    if (metricsRes.success && metricsRes.data) {
      const m = metricsRes.data;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };

      setVal('kpi-total', m.totalRegistrations ?? 0);
      setVal('kpi-accepted', m.acceptedRegistrations ?? 0);
      setVal('kpi-pending', m.pendingRegistrations ?? 0);
      setVal('kpi-refused', m.refusedRegistrations ?? 0);
      setVal('kpi-waiting', m.waitlistedRegistrations ?? 0);
      setVal('kpi-places', m.totalRemainingPlaces ?? 0);

      // Operational Alerts
      const alertsContainer = document.getElementById('dashboard-alerts');
      if (alertsContainer && (m.pendingRegistrations > 0 || m.totalRemainingPlaces < 100)) {
        let alertHtml = '';
        if (m.pendingRegistrations > 0) {
          alertHtml += `
            <div class="alert alert-warning mb-3">
              <span class="material-symbols-outlined">pending_actions</span>
              <div class="flex-1">
                <strong>${m.pendingRegistrations} demande(s) en attente d'instruction.</strong>
                <a href="/inscriptions?status=PENDING" class="underline ml-2">Traiter les dossiers &rarr;</a>
              </div>
            </div>
          `;
        }
        alertsContainer.innerHTML = alertHtml;
      }

      // Render Charts if canvas exists
      renderDashboardCharts(m);
    }

    if (regRes.success && regRes.data) {
      renderRecentRegistrationsTable(regRes.data);
    }
  } catch (err) {
    console.error('[Dashboard Load Error]', err);
  }
}

function renderDashboardCharts(m) {
  // 1. Status Distribution Doughnut Chart
  const statusCanvas = document.getElementById('chart-status-distribution');
  if (statusCanvas && typeof Chart !== 'undefined') {
    new Chart(statusCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Acceptées', 'En attente', 'Refusées', 'Liste d\'attente'],
        datasets: [{
          data: [
            m.acceptedRegistrations || 1,
            m.pendingRegistrations || 0,
            m.refusedRegistrations || 0,
            m.waitlistedRegistrations || 0
          ],
          backgroundColor: ['#059669', '#d97706', '#dc2626', '#0284c7'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } }
        },
        cutout: '68%'
      }
    });
  }

  // 2. Trend Line Chart
  const trendCanvas = document.getElementById('chart-registrations-trend');
  if (trendCanvas && typeof Chart !== 'undefined') {
    new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4', 'Cette semaine'],
        datasets: [{
          label: 'Inscriptions',
          data: [12, 19, 28, 45, m.totalRegistrations || 50],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function renderRecentRegistrationsTable(dossiers) {
  const tbody = document.getElementById('recent-registrations-tbody');
  if (!tbody) return;

  if (!dossiers || dossiers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-muted">Aucune demande enregistrée.</td></tr>`;
    return;
  }

  tbody.innerHTML = dossiers.map(d => `
    <tr class="pointer" onclick="window.location.href='/inscriptions/${d.id}'">
      <td class="font-semibold" style="font-family: monospace; color: var(--indigo);">${d.code}</td>
      <td class="font-medium">${d.student?.fullName || `${d.student?.firstNameFr || ''} ${d.student?.lastNameFr || ''}`.trim() || 'Élève'}</td>
      <td>${d.school?.shortName || d.school?.name || 'Campus Principal'}</td>
      <td>${d.level?.name || 'Niveau'}${d.choice?.name ? ` <span class="text-xs text-muted">(${d.choice.name})</span>` : ''}</td>
      <td>${formatDate(d.submittedAt || d.createdAt)}</td>
      <td>${formatStatusBadge(d.status)}</td>
      <td style="text-align: right;">
        <a href="/inscriptions/${d.id}" class="btn-icon btn-icon-sm" title="Voir le dossier" onclick="event.stopPropagation()">
          <span class="material-symbols-outlined">visibility</span>
        </a>
      </td>
    </tr>
  `).join('');
}

// ── INSCRIPTIONS LIST VIEW ──
async function initInscriptions() {
  const urlParams = new URLSearchParams(window.location.search);
  let status = urlParams.get('status') || '';
  let search = urlParams.get('search') || '';
  let schoolId = urlParams.get('schoolId') || '';
  let page = parseInt(urlParams.get('page') || '1', 10);

  const filterSearch = document.getElementById('filter-search');
  const filterStatus = document.getElementById('filter-status');
  const filterSchool = document.getElementById('filter-school');
  const btnApply = document.getElementById('btn-apply-filters');
  const btnReset = document.getElementById('btn-reset-filters');

  if (filterStatus) filterStatus.value = status;
  if (filterSearch) filterSearch.value = search;

  // Populate school select
  try {
    const schoolsRes = await adminFetch('/admin/schools');
    if (schoolsRes.success && schoolsRes.data && filterSchool) {
      filterSchool.innerHTML = `<option value="">Tous les établissements</option>` +
        schoolsRes.data.map(s => `<option value="${s.id}" ${s.id === schoolId ? 'selected' : ''}>${s.name}</option>`).join('');
    }
  } catch (err) {}

  async function loadTable(p = 1) {
    const query = new URLSearchParams({
      page: String(p),
      limit: '15',
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      ...(schoolId ? { schoolId } : {})
    });

    try {
      const [listRes, metricsRes] = await Promise.all([
        adminFetch(`/admin/registrations?${query.toString()}`),
        adminFetch('/admin/dashboard/metrics')
      ]);

      if (metricsRes.success && metricsRes.data) {
        const m = metricsRes.data;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
        setVal('kpi-total', m.totalRegistrations || 0);
        setVal('kpi-new', m.newRegistrations || 0);
        setVal('kpi-pending', m.pendingRegistrations || 0);
        setVal('kpi-accepted', m.acceptedRegistrations || 0);
      }

      const tbody = document.getElementById('inscriptions-tbody');
      const countEl = document.getElementById('filter-result-count');
      const paginationInfo = document.getElementById('pagination-info');

      if (!listRes.success || !listRes.data || listRes.data.length === 0) {
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8" class="text-center py-12 text-muted">
                <div class="empty-state">
                  <span class="material-symbols-outlined empty-state-icon">search_off</span>
                  <div class="empty-state-title">Aucun dossier trouvé</div>
                  <div class="empty-state-desc">Modifiez vos critères de recherche ou réinitialisez les filtres.</div>
                </div>
              </td>
            </tr>
          `;
        }
        if (countEl) countEl.textContent = '0 dossier trouvé';
        if (paginationInfo) paginationInfo.textContent = 'Affichage 0 sur 0';
        return;
      }

      const list = listRes.data;
      if (countEl) countEl.textContent = `${list.length} dossier(s) trouvé(s)`;
      if (paginationInfo) paginationInfo.textContent = `Page ${p} • Affichage de ${list.length} dossiers`;

      if (tbody) {
        tbody.innerHTML = list.map(d => `
          <tr class="pointer" onclick="window.location.href='/inscriptions/${d.id}'">
            <td class="font-semibold" style="font-family: monospace; color: var(--indigo);">${d.code}</td>
            <td>
              <div class="font-semibold text-primary">${d.student?.fullName || `${d.student?.firstNameFr || ''} ${d.student?.lastNameFr || ''}`.trim() || 'Élève'}</div>
              <div class="text-xs text-muted">${d.student?.gender === 'FEMALE' ? 'Fille' : 'Garçon'} • Né(e) le ${formatDate(d.student?.birthDate)}</div>
            </td>
            <td>
              <div class="font-medium">${d.primaryParent?.fullName || `${d.primaryParent?.firstNameFr || ''} ${d.primaryParent?.lastNameFr || ''}`.trim() || 'Parent'}</div>
              <div class="text-xs text-muted">${d.primaryParent?.phonePrimary || '—'}</div>
            </td>
            <td>${d.school?.shortName || d.school?.name || 'Campus'}</td>
            <td>
              <span class="badge badge-sm badge-role-admin">${d.level?.name || 'Niveau'}</span>
              ${d.choice?.name ? `<br><span class="badge badge-sm badge-role-staff mt-1" style="font-size:10px;background:rgba(99,102,241,0.1);color:var(--indigo);border:1px solid rgba(99,102,241,0.2);">${d.choice.name}</span>` : ''}
            </td>
            <td>${formatDate(d.submittedAt || d.createdAt)}</td>
            <td>${formatStatusBadge(d.status)}</td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="flex items-center justify-end gap-1" onclick="event.stopPropagation()">
                <a href="/inscriptions/${d.id}" class="btn-icon btn-icon-sm" title="Voir le dossier">
                  <span class="material-symbols-outlined">visibility</span>
                </a>
                ${d.status === 'ACCEPTED' ? `
                  <button class="btn btn-outline btn-xs text-warning" title="Annuler l'acceptation (libère la place)" onclick="cancelAcceptedRegistration('${d.id}', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">cancel</span>
                    <span>Annuler</span>
                  </button>
                  <button class="btn btn-outline btn-xs text-error" title="Annuler et supprimer définitivement" onclick="cancelAndDeleteRegistration('${d.id}', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">delete_forever</span>
                    <span>Annuler &amp; Supprimer</span>
                  </button>
                ` : (d.status === 'PENDING' || d.status === 'NEW' || d.status === 'UNDER_REVIEW') ? `
                  <button class="btn btn-success btn-xs" title="Accepter" onclick="quickUpdateStatus('${d.id}', 'ACCEPTED', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">check</span>
                  </button>
                  <button class="btn btn-outline btn-xs text-error" title="Refuser" onclick="quickUpdateStatus('${d.id}', 'REFUSED', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">close</span>
                  </button>
                  <button class="btn btn-outline btn-xs text-info" title="Liste d'attente" onclick="quickUpdateStatus('${d.id}', 'WAITLISTED', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">hourglass_top</span>
                  </button>
                  <button class="btn-icon btn-icon-sm text-error" title="Supprimer le dossier" onclick="confirmDeleteRegistration('${d.id}', '${(d.code||'').replace(/'/g, "\\'")}', '${d.status}')">
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                  </button>
                ` : d.status === 'WAITLISTED' ? `
                  <button class="btn btn-success btn-xs" title="Promouvoir / Accepter" onclick="quickUpdateStatus('${d.id}', 'ACCEPTED', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span>
                  </button>
                  <button class="btn btn-outline btn-xs text-error" title="Refuser" onclick="quickUpdateStatus('${d.id}', 'REFUSED', '${(d.code||'').replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined" style="font-size:14px;">close</span>
                  </button>
                  <button class="btn-icon btn-icon-sm text-error" title="Supprimer le dossier" onclick="confirmDeleteRegistration('${d.id}', '${(d.code||'').replace(/'/g, "\\'")}', '${d.status}')">
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                  </button>
                ` : `
                  <button class="btn-icon btn-icon-sm text-error" title="Supprimer le dossier" onclick="confirmDeleteRegistration('${d.id}', '${(d.code||'').replace(/'/g, "\\'")}', '${d.status}')">
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                  </button>
                `}
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('[Inscriptions Load Error]', err);
    }
  }

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      status = filterStatus?.value || '';
      search = filterSearch?.value.trim() || '';
      schoolId = filterSchool?.value || '';
      loadTable(1);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (filterStatus) filterStatus.value = '';
      if (filterSearch) filterSearch.value = '';
      if (filterSchool) filterSchool.value = '';
      status = ''; search = ''; schoolId = '';
      loadTable(1);
    });
  }

  // Quick status update from row
  window.quickUpdateStatus = async (id, newStatus, code) => {
    try {
      const res = await adminFetch(`/admin/registrations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        showAdminToast(`Dossier ${code} mis à jour : ${newStatus}`, 'success');
        loadTable(page);
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour statut.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  // Cancel accepted registration (frees capacity place)
  window.cancelAcceptedRegistration = async (id, code, cb) => {
    if (!confirm(`Annuler l'acceptation du dossier ${code} ?\n\nLe dossier passera au statut ANNULÉ et la place de capacité occupée sera immédiatement libérée.`)) return;
    try {
      const res = await adminFetch(`/admin/registrations/${id}/cancel-acceptance`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Annulation manuelle par l\'administrateur' })
      });
      if (res.success) {
        showAdminToast(`Acceptation du dossier ${code} annulée. Place de capacité libérée.`, 'info');
        if (typeof cb === 'function') cb();
        else if (typeof loadTable === 'function') loadTable(page);
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de l\'annulation.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  // Cancel & delete accepted registration atomically
  window.cancelAndDeleteRegistration = async (id, code, cb) => {
    const confirmed = confirm(
      `⚠️ ANNULER ET SUPPRIMER LE DOSSIER ${code} :\n\nCe dossier est actuellement ACCEPTÉ et occupe une place d'inscription.\n\nLa validation effectuera de manière sécurisée et irréversible :\n1. L'annulation de l'acceptation\n2. La libération immédiate de la place de capacité\n3. La suppression définitive des données du dossier\n\nConfirmez-vous cette opération ?`
    );
    if (!confirmed) return;

    try {
      const res = await adminFetch(`/admin/registrations/${id}?forceCancel=true`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(`Dossier ${code} annulé et supprimé définitivement. Capacité libérée.`, 'success');
        if (typeof cb === 'function') cb();
        else if (typeof loadTable === 'function') loadTable(page);
      } else {
        showAdminToast(res.error?.message || 'Erreur suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  // General delete handler for non-accepted inscriptions
  window.confirmDeleteRegistration = async (id, code, status, cb) => {
    if (status === 'ACCEPTED') {
      return window.cancelAndDeleteRegistration(id, code, cb);
    }
    if (!confirm(`Supprimer définitivement le dossier ${code} ? Cette action est irréversible.`)) return;
    try {
      const res = await adminFetch(`/admin/registrations/${id}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(`Dossier ${code} supprimé avec succès.`, 'info');
        if (typeof cb === 'function') cb();
        else if (typeof loadTable === 'function') loadTable(page);
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur de communication avec le serveur.', 'error');
    }
  };

  loadTable(page);
}

// ── INSCRIPTION DETAIL VIEW (/inscriptions/:id) ──
async function initDossierDetail() {
  const parts = window.location.pathname.split('/');
  const id = parts[parts.length - 1];
  if (!id || id === 'inscriptions') return;

  try {
    const res = await adminFetch(`/admin/registrations/${id}`);
    if (!res.success || !res.data) {
      showAdminToast('Impossible de charger les détails du dossier.', 'error');
      return;
    }

    const d = res.data;

    // Header elements
    const refBreadcrumb = document.getElementById('dossier-ref-breadcrumb');
    const refTitle = document.getElementById('dossier-ref-title');
    const statusBadge = document.getElementById('dossier-status-badge');
    const subtitle = document.getElementById('dossier-subtitle');

    if (refBreadcrumb) refBreadcrumb.textContent = d.code;
    if (refTitle) refTitle.textContent = `Dossier ${d.code}`;
    if (statusBadge) statusBadge.outerHTML = formatStatusBadge(d.status);
    if (subtitle) subtitle.textContent = `Soumis le ${formatDate(d.submittedAt || d.createdAt)} • Année 2026/2027`;

    // Pedagogical
    const setEl = (elemId, text) => { const el = document.getElementById(elemId); if (el) el.textContent = text || '—'; };
    setEl('dossier-school', d.school?.name);
    setEl('dossier-cycle', d.level?.cycle);
    setEl('dossier-level', d.level?.name);
    if (d.choice?.name) {
      setEl('dossier-choice', d.choice.name);
      const choiceCol = document.getElementById('dossier-choice-col');
      if (choiceCol) choiceCol.style.display = 'block';
    }

    // Student
    const st = d.student || {};
    setEl('student-name', st.fullName || `${st.firstNameFr || ''} ${st.lastNameFr || ''}`.trim());
    setEl('student-dob', formatDate(st.birthDate));
    setEl('student-gender', st.gender === 'FEMALE' ? 'Fille' : 'Garçon');
    setEl('student-prev-school', st.currentSchool || 'Non renseigné');

    // Parent
    const pt = d.primaryParent || {};
    setEl('parent-name', pt.fullName || `${pt.firstNameFr || ''} ${pt.lastNameFr || ''}`.trim());
    setEl('parent-phone', pt.phonePrimary);
    setEl('parent-email', pt.email);
    setEl('parent-address', pt.address);

    // Documents
    const docsTbody = document.getElementById('dossier-docs-tbody');
    if (docsTbody) {
      const docs = d.documents || [];
      if (docs.length === 0) {
        docsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-muted">Aucune pièce jointe transmise.</td></tr>`;
      } else {
        docsTbody.innerHTML = docs.map(doc => `
          <tr>
            <td class="font-medium">${doc.type}</td>
            <td class="font-mono text-xs">${doc.originalName || doc.name}</td>
            <td><span class="badge badge-accepted">Reçu</span></td>
            <td style="text-align: right;">
              <a href="${doc.url || '#'}" target="_blank" class="btn btn-outline btn-xs">
                <span class="material-symbols-outlined">download</span> Télécharger
              </a>
            </td>
          </tr>
        `).join('');
      }
    }

    // Capacity Gauge
    const cap = d.level?.capacity || {};
    const max = cap.capacityMax || 250;
    const accepted = cap.acceptedCount || 0;
    const remaining = Math.max(0, max - accepted);
    const pct = Math.min(100, Math.round((accepted / max) * 100));

    setEl('capacity-total', `${max} places`);
    setEl('capacity-accepted', `${accepted} élèves`);
    setEl('capacity-remaining', `${remaining} restantes`);
    setEl('capacity-pct-label', `${pct}%`);

    const barFill = document.getElementById('capacity-bar-fill');
    if (barFill) {
      barFill.style.width = `${pct}%`;
      if (pct >= 100) barFill.className = 'capacity-bar-fill full';
      else if (pct >= 90) barFill.className = 'capacity-bar-fill warn';
    }

    // Direct Decision Buttons
    const handleStatus = async (newStatus) => {
      try {
        const updateRes = await adminFetch(`/admin/registrations/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
        if (updateRes.success) {
          showAdminToast(`Statut du dossier mis à jour: ${newStatus}`, 'success');
          setTimeout(() => window.location.reload(), 300);
        } else {
          showAdminToast(updateRes.error?.message || 'Erreur lors de la mise à jour.', 'error');
        }
      } catch (e) {
        showAdminToast('Erreur de communication avec le serveur.', 'error');
      }
    };

    const standardActions = document.getElementById('dossier-actions-standard');
    const acceptedActions = document.getElementById('dossier-actions-accepted');
    const deleteActions = document.getElementById('dossier-actions-delete');
    const btnCancelAcceptance = document.getElementById('btn-cancel-acceptance');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnDeleteReg = document.getElementById('btn-delete-registration');

    if (d.status === 'ACCEPTED') {
      if (standardActions) standardActions.classList.add('hidden');
      if (acceptedActions) acceptedActions.classList.remove('hidden');
      if (deleteActions) deleteActions.classList.add('hidden');
    } else {
      if (standardActions) standardActions.classList.remove('hidden');
      if (acceptedActions) acceptedActions.classList.add('hidden');
      if (deleteActions) deleteActions.classList.remove('hidden');
    }

    if (btnAccept) btnAccept.onclick = () => handleStatus('ACCEPTED');
    if (btnRefuse) btnRefuse.onclick = () => handleStatus('REFUSED');
    if (btnWaitlist) btnWaitlist.onclick = () => handleStatus('WAITLISTED');
    if (btnApplyOverride && selectOverride) {
      btnApplyOverride.onclick = () => handleStatus(selectOverride.value);
    }

    if (btnCancelAcceptance) {
      btnCancelAcceptance.onclick = () => {
        if (window.cancelAcceptedRegistration) {
          window.cancelAcceptedRegistration(id, d.code, () => window.location.reload());
        }
      };
    }

    if (btnCancelDelete) {
      btnCancelDelete.onclick = () => {
        if (window.cancelAndDeleteRegistration) {
          window.cancelAndDeleteRegistration(id, d.code, () => {
            window.location.href = '/inscriptions';
          });
        }
      };
    }

    if (btnDeleteReg) {
      btnDeleteReg.onclick = () => {
        if (window.confirmDeleteRegistration) {
          window.confirmDeleteRegistration(id, d.code, d.status, () => {
            window.location.href = '/inscriptions';
          });
        }
      };
    }

  } catch (err) {
    console.error('[Detail Init Error]', err);
  }
}

// ── NOUVELLE INSCRIPTION VIEW ──
async function initNouvelleInscription() {
  const schoolSelect = document.getElementById('reg-school');
  const levelSelect = document.getElementById('reg-level');
  const form = document.getElementById('form-new-registration');
  const alertBox = document.getElementById('new-reg-alert');

  try {
    const [schoolsRes, levelsRes] = await Promise.all([
      adminFetch('/admin/schools'),
      adminFetch('/admin/levels')
    ]);

    if (schoolsRes.success && schoolsRes.data && schoolSelect) {
      schoolSelect.innerHTML = `<option value="">Sélectionner un établissement…</option>` +
        schoolsRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    if (levelsRes.success && levelsRes.data && levelSelect) {
      levelSelect.innerHTML = `<option value="">Sélectionner un niveau…</option>` +
        levelsRes.data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    }
  } catch (err) {}

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        schoolId: schoolSelect?.value,
        levelId: levelSelect?.value,
        student: {
          firstNameFr: document.getElementById('reg-first-name')?.value.trim(),
          lastNameFr: document.getElementById('reg-last-name')?.value.trim(),
          birthDate: document.getElementById('reg-birth-date')?.value,
          gender: document.getElementById('reg-gender')?.value,
          currentSchool: document.getElementById('reg-prev-school')?.value.trim()
        },
        primaryParent: {
          firstNameFr: document.getElementById('reg-parent-name')?.value.trim(),
          lastNameFr: 'Parent',
          phonePrimary: document.getElementById('reg-parent-phone')?.value.trim(),
          email: document.getElementById('reg-parent-email')?.value.trim(),
          address: document.getElementById('reg-parent-address')?.value.trim()
        }
      };

      try {
        const res = await adminFetch('/admin/registrations', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.success && res.data) {
          showAdminToast(`Dossier créé: ${res.data.code}`, 'success');
          setTimeout(() => { window.location.href = `/inscriptions/${res.data.id}`; }, 400);
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur de communication.', 'error');
      }
    });
  }
}

// ── DOSSIER DETAIL VIEW (/inscriptions/:id) ──
async function initDossierDetail() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const dossierId = parts[parts.length - 1];
  if (!dossierId || dossierId === 'inscriptions') return;

  const refBreadcrumb = document.getElementById('dossier-ref-breadcrumb');
  const refTitle = document.getElementById('dossier-ref-title');
  const statusBadge = document.getElementById('dossier-status-badge');
  const subtitle = document.getElementById('dossier-subtitle');

  // Pedagogical elements
  const elSchool = document.getElementById('dossier-school');
  const elCycle = document.getElementById('dossier-cycle');
  const elLevel = document.getElementById('dossier-level');
  const elChoiceCol = document.getElementById('dossier-choice-col');
  const elChoice = document.getElementById('dossier-choice');
  const elYear = document.getElementById('dossier-year');

  // Student elements
  const elStudentName = document.getElementById('student-name');
  const elStudentDob = document.getElementById('student-dob');
  const elStudentGender = document.getElementById('student-gender');
  const elStudentPrev = document.getElementById('student-prev-school');

  // Parent elements
  const elParentName = document.getElementById('parent-name');
  const elParentPhone = document.getElementById('parent-phone');
  const elParentEmail = document.getElementById('parent-email');
  const elParentAddress = document.getElementById('parent-address');
  const elParentAccountBadge = document.getElementById('parent-account-badge');

  // Documents
  const docsTbody = document.getElementById('dossier-docs-tbody');

  // Notes
  const noteInput = document.getElementById('internal-note-input');
  const btnSaveNote = document.getElementById('btn-save-note');
  const notesList = document.getElementById('internal-notes-list');

  // Decision buttons
  const btnAccept = document.getElementById('btn-accept-registration');
  const btnWaitlist = document.getElementById('btn-waitlist-registration');
  const btnRefuse = document.getElementById('btn-refuse-registration');
  const actionsStandard = document.getElementById('dossier-actions-standard');
  const actionsAccepted = document.getElementById('dossier-actions-accepted');
  const btnCancelAcceptance = document.getElementById('btn-cancel-acceptance');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnDelete = document.getElementById('btn-delete-registration');
  const selectStatus = document.getElementById('select-status-override');
  const btnApplyStatus = document.getElementById('btn-apply-status-override');

  // Capacity elements
  const capTotal = document.getElementById('capacity-total');
  const capAccepted = document.getElementById('capacity-accepted');
  const capRemaining = document.getElementById('capacity-remaining');
  const capPctLabel = document.getElementById('capacity-pct-label');
  const capBarFill = document.getElementById('capacity-bar-fill');

  // Timeline
  const historyTimeline = document.getElementById('dossier-history-timeline');

  let currentDossier = null;

  async function loadDossier() {
    try {
      const res = await adminFetch(`/admin/registrations/${dossierId}`);
      if (!res.success || !res.data) {
        showAdminToast(res.error?.message || 'Dossier introuvable.', 'error');
        return;
      }
      currentDossier = res.data;
      renderDossier(currentDossier);
    } catch (err) {
      showAdminToast('Erreur lors du chargement du dossier.', 'error');
    }
  }

  function renderDossier(d) {
    const code = d.registrationCode || d.code || dossierId;
    if (refBreadcrumb) refBreadcrumb.textContent = code;
    if (refTitle) refTitle.textContent = `Dossier ${code}`;
    if (subtitle) {
      subtitle.textContent = `Soumis le ${formatDate(d.submittedAt || d.createdAt)} • Année scolaire ${d.academicYear?.name || '2026/2027'}`;
    }
    if (statusBadge) {
      statusBadge.innerHTML = formatStatusBadge(d.status);
    }

    // Pedagogy
    if (elSchool) elSchool.textContent = d.school?.name || '—';
    if (elCycle) elCycle.textContent = d.level?.cycleNameFr || d.cycle?.name || '—';
    if (elLevel) elLevel.textContent = d.level?.name || d.level?.nameFr || '—';
    if (elYear) elYear.textContent = d.academicYear?.name || '2026/2027';

    if (d.choice?.name) {
      if (elChoiceCol) elChoiceCol.style.display = 'block';
      if (elChoice) elChoice.textContent = d.choice.name;
    } else {
      if (elChoiceCol) elChoiceCol.style.display = 'none';
    }

    // Student
    const st = d.student || {};
    if (elStudentName) elStudentName.textContent = st.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || '—';
    if (elStudentDob) elStudentDob.textContent = formatDate(st.birthDate || st.dateOfBirth);
    if (elStudentGender) elStudentGender.textContent = st.gender === 'MALE' ? 'Masculin (Garçon)' : st.gender === 'FEMALE' ? 'Féminin (Fille)' : '—';
    if (elStudentPrev) elStudentPrev.textContent = st.currentSchool || '—';

    // Parent
    const pr = d.parent || {};
    if (elParentName) elParentName.textContent = pr.fullName || `${pr.firstName || ''} ${pr.lastName || ''}`.trim() || '—';
    if (elParentPhone) elParentPhone.textContent = pr.phonePrimary || pr.phone || '—';
    if (elParentEmail) elParentEmail.textContent = pr.email || '—';
    if (elParentAddress) elParentAddress.textContent = pr.address || `${pr.commune || ''} ${pr.wilaya || ''}`.trim() || '—';

    // Parent Client Account status
    if (elParentAccountBadge) {
      if (d.hasClientAccount || d.clientUserId || (d.parent && d.parent.userId)) {
        elParentAccountBadge.className = 'badge badge-success';
        elParentAccountBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;margin-right:2px;">verified_user</span> Compte Actif';
        elParentAccountBadge.title = d.clientUser ? `Compte lié: ${d.clientUser.email}` : 'Compte Client lié';
      } else {
        elParentAccountBadge.className = 'badge badge-neutral';
        elParentAccountBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;margin-right:2px;">person_off</span> Aucun compte';
        elParentAccountBadge.title = 'Aucun compte client associé';
      }
    }

    // Status toggle UI
    if (d.status === 'ACCEPTED') {
      actionsStandard?.classList.add('hidden');
      actionsAccepted?.classList.remove('hidden');
    } else {
      actionsStandard?.classList.remove('hidden');
      actionsAccepted?.classList.add('hidden');
    }
    if (selectStatus) selectStatus.value = d.status;

    // Render documents
    renderDocs(d.documents || []);

    // Render notes
    renderNotes(d.notes || []);

    // Render history
    renderHistory(d.history || []);

    // Load capacity gauge if sylId present
    const sylId = d.schoolYearLevelId || d.syl?.id;
    if (sylId) {
      loadCapacity(sylId);
    }
  }

  function renderDocs(docs) {
    if (!docsTbody) return;
    if (!docs || docs.length === 0) {
      docsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-muted">Aucun document déposé pour ce dossier.</td></tr>`;
      return;
    }

    docsTbody.innerHTML = docs.map(doc => {
      const statusMap = {
        VALIDATED: { label: 'Validé', cls: 'badge-accepted' },
        PENDING_REVIEW: { label: 'En attente d\'examen', cls: 'badge-pending' },
        UPLOADED: { label: 'Téléversé', cls: 'badge-new' },
        REJECTED: { label: 'Rejeté', cls: 'badge-refused' },
        REPLACEMENT_REQUIRED: { label: 'Remplacement requis', cls: 'badge-waiting' }
      };
      const st = statusMap[doc.status] || { label: doc.status, cls: 'badge-inactive' };
      const docName = doc.nameFr || doc.documentTypeName || 'Document';

      return `
        <tr>
          <td>
            <div class="font-semibold text-sm">${docName}</div>
            ${doc.nameAr ? `<div class="text-xs text-muted font-normal">${doc.nameAr}</div>` : ''}
          </td>
          <td>
            <div class="text-sm truncate" style="max-width: 200px;" title="${doc.originalFilename || ''}">
              ${doc.originalFilename || '—'}
            </div>
          </td>
          <td>
            <span class="badge ${st.cls}"><span class="badge-dot"></span>${st.label}</span>
            ${doc.rejectionReason ? `<div class="text-xs text-danger mt-1">Motif: ${doc.rejectionReason}</div>` : ''}
          </td>
          <td style="text-align: right;">
            <div class="flex items-center justify-end gap-1">
              ${doc.previewUrl ? `
                <a href="${doc.previewUrl}" target="_blank" class="btn btn-outline btn-xs" title="Visualiser le document">
                  <span class="material-symbols-outlined text-xs">visibility</span>
                </a>
              ` : ''}
              ${doc.downloadUrl ? `
                <a href="${doc.downloadUrl}" target="_blank" download class="btn btn-outline btn-xs" title="Télécharger">
                  <span class="material-symbols-outlined text-xs">download</span>
                </a>
              ` : ''}
              ${doc.status !== 'VALIDATED' ? `
                <button class="btn btn-success btn-xs" onclick="validateDossierDoc('${doc.id}')" title="Valider cette pièce">
                  <span class="material-symbols-outlined text-xs">check</span>
                </button>
              ` : ''}
              ${doc.status !== 'REJECTED' ? `
                <button class="btn btn-danger-outline btn-xs" onclick="rejectDossierDoc('${doc.id}')" title="Rejeter / Demander remplacement">
                  <span class="material-symbols-outlined text-xs">close</span>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.validateDossierDoc = async (docId) => {
    try {
      const res = await adminFetch(`/admin/documents/${docId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'VALIDATED' })
      });
      if (res.success) {
        showAdminToast('Pièce justificative validée.', 'success');
        loadDossier();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la validation.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.rejectDossierDoc = async (docId) => {
    const reason = prompt('Indiquez le motif de rejet ou du remplacement requis pour le parent :');
    if (reason === null) return;
    try {
      const res = await adminFetch(`/admin/documents/${docId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'REPLACEMENT_REQUIRED',
          rejectionReason: reason || 'Document non lisible ou non conforme.'
        })
      });
      if (res.success) {
        showAdminToast('Demande de remplacement enregistrée.', 'warning');
        loadDossier();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors du rejet.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  async function updateDossierStatus(status, comment = '') {
    try {
      const res = await adminFetch(`/admin/registrations/${dossierId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, publicComment: comment })
      });
      if (res.success) {
        showAdminToast(`Statut mis à jour : ${status}`, 'success');
        loadDossier();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  }

  if (btnAccept) {
    btnAccept.onclick = () => updateDossierStatus('ACCEPTED', 'Dossier validé et accepté.');
  }
  if (btnWaitlist) {
    btnWaitlist.onclick = () => updateDossierStatus('WAITLISTED', 'Placé sur liste d\'attente.');
  }
  if (btnRefuse) {
    btnRefuse.onclick = () => {
      const reason = prompt('Indiquez le motif de refus :');
      if (reason !== null) updateDossierStatus('REFUSED', reason || 'Dossier non retenu.');
    };
  }
  if (btnCancelAcceptance) {
    btnCancelAcceptance.onclick = () => updateDossierStatus('PENDING', 'Acceptation annulée, dossier repassé en instruction.');
  }
  if (btnCancelDelete || btnDelete) {
    const delFn = async () => {
      if (!confirm('Confirmez-vous la suppression définitive de ce dossier ?')) return;
      try {
        const res = await adminFetch(`/admin/registrations/${dossierId}?forceCancel=true`, {
          method: 'DELETE'
        });
        if (res.success) {
          showAdminToast('Dossier supprimé avec succès.', 'success');
          setTimeout(() => { window.location.href = '/inscriptions'; }, 500);
        } else {
          showAdminToast(res.error?.message || 'Erreur suppression.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    };
    if (btnCancelDelete) btnCancelDelete.onclick = delFn;
    if (btnDelete) btnDelete.onclick = delFn;
  }
  if (btnApplyStatus && selectStatus) {
    btnApplyStatus.onclick = () => updateDossierStatus(selectStatus.value);
  }

  function renderNotes(notes) {
    if (!notesList) return;
    if (!notes || notes.length === 0) {
      notesList.innerHTML = `<div class="text-xs text-muted">Aucune observation enregistrée pour l'instant.</div>`;
      return;
    }
    notesList.innerHTML = notes.map(n => `
      <div class="card p-3" style="background:#f8fafc;">
        <div class="flex justify-between text-xs text-muted mb-1">
          <span class="font-semibold text-primary">${n.authorName || 'Agent'}</span>
          <span>${formatDate(n.createdAt)}</span>
        </div>
        <div class="text-sm">${n.content}</div>
      </div>
    `).join('');
  }

  if (btnSaveNote && noteInput) {
    btnSaveNote.onclick = async () => {
      const content = noteInput.value.trim();
      if (!content) return;
      btnSaveNote.disabled = true;
      try {
        const res = await adminFetch(`/admin/registrations/${dossierId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
        if (res.success) {
          noteInput.value = '';
          showAdminToast('Observation ajoutée.', 'success');
          loadDossier();
        } else {
          showAdminToast(res.error?.message || 'Erreur ajout note.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      } finally {
        btnSaveNote.disabled = false;
      }
    };
  }

  function renderHistory(hist) {
    if (!historyTimeline) return;
    if (!hist || hist.length === 0) {
      historyTimeline.innerHTML = `<div class="text-xs text-muted">Historique vide.</div>`;
      return;
    }
    historyTimeline.innerHTML = hist.map(h => `
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-xs">${h.toStatus || 'STATUT'}</span>
            <span class="text-xs text-muted">${formatDate(h.createdAt)}</span>
          </div>
          ${h.publicComment ? `<div class="text-xs text-muted mt-1">${h.publicComment}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  async function loadCapacity(sylId) {
    try {
      const res = await adminFetch(`/admin/school-year-levels/${sylId}/capacity`);
      if (res.success && res.data) {
        const c = res.data;
        if (capTotal) capTotal.textContent = c.capacityMax != null ? `${c.capacityMax} élèves` : 'Illimitée';
        if (capAccepted) capAccepted.textContent = `${c.acceptedCount || 0}`;
        if (capRemaining) capRemaining.textContent = c.remainingPlaces != null ? `${c.remainingPlaces}` : '—';
        const fill = c.fillRatePercent || 0;
        if (capPctLabel) capPctLabel.textContent = `${fill}%`;
        if (capBarFill) capBarFill.style.width = `${Math.min(100, fill)}%`;
      }
    } catch (e) {}
  }

  loadDossier();
}

// ── ETABLISSEMENTS ──
let currentSchoolTab = 'ACTIVE';

window.switchSchoolTab = function(tab) {
  currentSchoolTab = tab;
  document.getElementById('tab-schools-active')?.classList.toggle('active', tab === 'ACTIVE');
  document.getElementById('tab-schools-archived')?.classList.toggle('active', tab === 'ARCHIVED');
  document.getElementById('tab-schools-all')?.classList.toggle('active', tab === 'ALL');
  if (typeof window.loadSchoolsTable === 'function') {
    window.loadSchoolsTable(tab);
  }
};

async function initEtablissements() {
  const grid = document.getElementById('schools-grid');
  const btnAdd = document.getElementById('btn-add-school');
  const modal = document.getElementById('modal-school');
  const modalTitle = modal?.querySelector('.modal-title');
  const btnClose = document.getElementById('btn-close-school-modal');
  const btnCancel = document.getElementById('btn-cancel-school');
  const form = document.getElementById('form-school');
  const currentUser = AdminAuth.getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  if (btnAdd && modal) {
    btnAdd.onclick = () => {
      form.reset();
      delete form.dataset.editId;
      if (modalTitle) modalTitle.textContent = 'Ajouter un établissement';
      modal.classList.add('open');
    };
  }
  if (btnClose && modal) btnClose.onclick = () => modal.classList.remove('open');
  if (btnCancel && modal) btnCancel.onclick = () => modal.classList.remove('open');

  async function loadSchools(tab = currentSchoolTab) {
    if (!grid) return;
    try {
      const res = await adminFetch(`/admin/schools?status=${tab}`);
      if (res.success && res.data) {
        const schoolsList = res.data;

        if (schoolsList.length === 0) {
          const emptyMsgs = {
            ACTIVE: 'Aucun établissement actif actuellement.',
            ARCHIVED: 'Aucun établissement archivé.',
            ALL: 'Aucun établissement enregistré.'
          };
          grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1;">
              <div class="card-body text-center py-12 text-muted">
                <span class="material-symbols-outlined mb-2" style="font-size:36px;opacity:0.5;">apartment</span>
                <div>${emptyMsgs[tab] || 'Aucun établissement trouvé.'}</div>
              </div>
            </div>
          `;
          return;
        }

        grid.innerHTML = schoolsList.map(s => {
          const isArchived = s.status === 'ARCHIVED' || !!s.archivedAt;
          const safeName = (s.name || '').replace(/'/g, "\\'");
          const safeCode = (s.code || '').replace(/'/g, "\\'");

          return `
            <div class="card ${isArchived ? 'opacity-90' : ''}">
              <div class="card-header">
                <div class="card-title flex items-center gap-2">
                  <span>${s.name}</span>
                  ${isArchived ? '<span class="badge badge-inactive text-xs font-semibold">Archivé</span>' : ''}
                </div>
                <span class="badge ${s.status === 'ACTIVE' && !isArchived ? 'badge-accepted' : 'badge-inactive'}">
                  ${isArchived ? 'Archivé' : s.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div class="card-body">
                <div class="text-sm text-muted mb-2">Code: <strong class="text-primary">${s.code}</strong></div>
                <div class="text-sm mb-1 flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:16px;">location_on</span>
                  ${s.address || 'Alger, Algérie'}
                </div>
                <div class="text-sm flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:16px;">call</span>
                  ${s.phonePrimary || s.phone || '+213 21 00 00 00'}
                </div>
                ${isArchived && s.archivedAt ? `<div class="text-xs text-muted mt-2">Archivé le ${formatDate(s.archivedAt)}</div>` : ''}
              </div>
              <div class="card-footer flex justify-between items-center">
                <a href="/niveaux-capacites?schoolId=${s.id}" class="text-xs text-primary-color font-semibold hover:underline">
                  Voir les capacités &rarr;
                </a>
                <div class="flex items-center gap-1">
                  <button class="btn btn-outline btn-xs" onclick="editSchool('${s.id}')" title="Voir / Modifier">
                    <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
                  </button>

                  ${isArchived ? `
                    <button class="btn btn-success btn-xs" onclick="restoreSchool('${s.id}', '${safeName}')" title="Restaurer l'établissement">
                      <span class="material-symbols-outlined" style="font-size:14px;">settings_backup_restore</span>
                      <span>Restaurer</span>
                    </button>
                    ${isSuperAdmin ? `
                    <button class="btn btn-outline btn-xs text-error ml-1" onclick="permanentDeleteSchool('${s.id}', '${safeName}', '${safeCode}')" title="Supprimer définitivement">
                      <span class="material-symbols-outlined" style="font-size:14px;">delete_forever</span>
                    </button>` : ''}
                  ` : `
                    <button class="btn btn-outline btn-xs text-warning ml-1" onclick="archiveSchool('${s.id}', '${safeName}')" title="Archiver l'établissement">
                      <span class="material-symbols-outlined" style="font-size:14px;">archive</span>
                    </button>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      if (grid) {
        grid.innerHTML = `
          <div class="card" style="grid-column: 1 / -1;">
            <div class="card-body text-center py-12 text-error">
              Erreur lors du chargement des établissements.
            </div>
          </div>
        `;
      }
    }
  }

  window.loadSchoolsTable = loadSchools;

  window.editSchool = async (id) => {
    try {
      const res = await adminFetch(`/admin/schools/${id}`);
      if (res.success && res.data) {
        const s = res.data;
        document.getElementById('school-name').value = s.name || '';
        document.getElementById('school-code').value = s.code || '';
        document.getElementById('school-address').value = s.address || '';
        if (document.getElementById('school-wilaya')) document.getElementById('school-wilaya').value = s.wilaya || '';
        if (document.getElementById('school-commune')) document.getElementById('school-commune').value = s.commune || '';
        document.getElementById('school-phone').value = s.phonePrimary || s.phone || '';
        if (document.getElementById('school-whatsapp')) document.getElementById('school-whatsapp').value = s.whatsapp || '';
        document.getElementById('school-email').value = s.emailPrimary || s.email || '';
        if (document.getElementById('school-google-maps-url')) document.getElementById('school-google-maps-url').value = s.googleMapsUrl || '';
        if (document.getElementById('school-latitude')) document.getElementById('school-latitude').value = s.latitude !== null && s.latitude !== undefined ? s.latitude : '';
        if (document.getElementById('school-longitude')) document.getElementById('school-longitude').value = s.longitude !== null && s.longitude !== undefined ? s.longitude : '';
        const mapCheck = document.getElementById('school-is-map-public');
        if (mapCheck) mapCheck.checked = s.isMapPublic !== false;
        document.getElementById('school-status').value = s.status === 'ARCHIVED' ? 'INACTIVE' : (s.status || 'ACTIVE');
        form.dataset.editId = id;
        if (modalTitle) modalTitle.textContent = 'Modifier l\'établissement';
        modal.classList.add('open');
      }
    } catch (err) {
      showAdminToast('Impossible de charger les données.', 'error');
    }
  };

  window.archiveSchool = async (id, name) => {
    if (!confirm(`Archiver l'établissement "${name}" ?\n\nL'établissement sera déplacé dans l'onglet "Archivés" et masqué des sélecteurs publics, mais tout l'historique sera préservé.`)) return;
    try {
      const res = await adminFetch(`/admin/schools/${id}/archive`, { method: 'POST' });
      if (res.success) {
        showAdminToast('Établissement archivé avec succès.', 'info');
        loadSchools(currentSchoolTab);
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de l\'archivage.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur lors de l\'archivage.', 'error');
    }
  };

  window.restoreSchool = async (id, name) => {
    if (!confirm(`Restaurer l'établissement "${name}" et le réactiver ?`)) return;
    try {
      const res = await adminFetch(`/admin/schools/${id}/restore`, { method: 'POST' });
      if (res.success) {
        showAdminToast('Établissement restauré avec succès.', 'success');
        loadSchools(currentSchoolTab);
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la restauration.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur lors de la restauration.', 'error');
    }
  };

  // ── Permanent Delete School — modal-driven with delete-preview ──
  let _pdelTargetId = null;
  let _pdelTargetCode = null;
  let _pdelTargetArchiveId = null;

  const pdelModal       = document.getElementById('modal-permanent-delete-school');
  const pdelLoading     = document.getElementById('pdel-loading');
  const pdelBlocker     = document.getElementById('pdel-blocker');
  const pdelAllowed     = document.getElementById('pdel-allowed');
  const pdelSchoolName  = document.getElementById('pdel-school-name');
  const pdelSchoolCode  = document.getElementById('pdel-school-code');
  const pdelCodeLabel   = document.getElementById('pdel-code-label');
  const pdelCodeInput   = document.getElementById('pdel-code-confirm');
  const pdelBtnConfirm  = document.getElementById('pdel-btn-confirm');
  const pdelBlockList   = document.getElementById('pdel-blocking-list');
  const pdelConfigList  = document.getElementById('pdel-config-list');
  const pdelBtnArchive  = document.getElementById('pdel-btn-archive-instead');

  function _pdelClose() {
    if (pdelModal) pdelModal.classList.remove('open');
    _pdelTargetId = null;
    _pdelTargetCode = null;
    _pdelTargetArchiveId = null;
    if (pdelCodeInput) pdelCodeInput.value = '';
    if (pdelBtnConfirm) { pdelBtnConfirm.disabled = true; pdelBtnConfirm.style.display = 'none'; }
  }

  function _pdelReset() {
    [pdelLoading, pdelBlocker, pdelAllowed].forEach(el => el && el.classList.add('hidden'));
    if (pdelLoading) pdelLoading.classList.remove('hidden');
    if (pdelBtnConfirm) { pdelBtnConfirm.disabled = true; pdelBtnConfirm.style.display = 'none'; }
    if (pdelCodeInput) pdelCodeInput.value = '';
  }

  function _pdelConfigRow(icon, label, count) {
    if (!count) return '';
    return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 0.5rem;background:var(--color-surface-alt,var(--color-bg-secondary));border-radius:var(--radius-sm);font-size:0.82rem;">
      <span class="material-symbols-outlined text-muted" style="font-size:15px;">${icon}</span>
      <span>${label}</span>
      <span class="badge badge-inactive ml-auto" style="font-size:0.75rem;">${count}</span>
    </div>`;
  }

  function _pdelBlockRow(icon, label, count) {
    return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 0.5rem;background:var(--color-error-bg,rgba(239,68,68,0.08));border:1px solid var(--color-error-border,rgba(239,68,68,0.2));border-radius:var(--radius-sm);font-size:0.82rem;">
      <span class="material-symbols-outlined text-error" style="font-size:15px;">${icon}</span>
      <span>${label}</span>
      <span class="badge badge-rejected ml-auto" style="font-size:0.75rem;">${count}</span>
    </div>`;
  }

  if (pdelCodeInput) {
    pdelCodeInput.addEventListener('input', () => {
      const typed = pdelCodeInput.value.trim().toUpperCase();
      const match = _pdelTargetCode && typed === _pdelTargetCode.toUpperCase();
      if (pdelBtnConfirm) pdelBtnConfirm.disabled = !match;
    });
  }

  if (document.getElementById('btn-close-pdel-modal')) {
    document.getElementById('btn-close-pdel-modal').onclick = _pdelClose;
  }
  if (document.getElementById('pdel-btn-cancel')) {
    document.getElementById('pdel-btn-cancel').onclick = _pdelClose;
  }
  if (pdelModal) {
    pdelModal.addEventListener('click', (e) => { if (e.target === pdelModal) _pdelClose(); });
  }

  if (pdelBtnConfirm) {
    pdelBtnConfirm.addEventListener('click', async () => {
      if (!_pdelTargetId) return;
      pdelBtnConfirm.disabled = true;
      pdelBtnConfirm.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span><span>Suppression…</span>';
      try {
        const res = await adminFetch(`/admin/schools/${_pdelTargetId}?permanent=true`, { method: 'DELETE' });
        if (res.success) {
          showAdminToast('Établissement supprimé définitivement avec succès.', 'success');
          _pdelClose();
          loadSchools(currentSchoolTab);
        } else {
          showAdminToast(res.error?.message || 'Suppression définitive impossible.', 'error');
          pdelBtnConfirm.disabled = false;
          pdelBtnConfirm.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">delete_forever</span><span>Supprimer définitivement</span>';
        }
      } catch (err) {
        showAdminToast('Erreur serveur lors de la suppression.', 'error');
        pdelBtnConfirm.disabled = false;
        pdelBtnConfirm.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">delete_forever</span><span>Supprimer définitivement</span>';
      }
    });
  }

  if (pdelBtnArchive) {
    pdelBtnArchive.addEventListener('click', async () => {
      if (!_pdelTargetArchiveId) return;
      const archId = _pdelTargetArchiveId;
      _pdelClose();
      await window.archiveSchool(archId, pdelSchoolName?.textContent || archId);
    });
  }

  window.permanentDeleteSchool = async (id, name, code) => {
    _pdelTargetId = id;
    _pdelTargetCode = code || null;
    _pdelTargetArchiveId = id;
    if (pdelSchoolName) pdelSchoolName.textContent = name || id;
    if (pdelSchoolCode) pdelSchoolCode.textContent = code ? `Code : ${code}` : '';
    if (pdelCodeLabel) pdelCodeLabel.textContent = code || '';
    _pdelReset();
    if (pdelModal) pdelModal.classList.add('open');

    try {
      const previewRes = await adminFetch(`/admin/schools/${id}/delete-preview`);
      [pdelLoading].forEach(el => el && el.classList.add('hidden'));

      if (!previewRes.success) {
        showAdminToast(previewRes.error?.message || 'Impossible de charger l\'aperçu.', 'error');
        _pdelClose();
        return;
      }

      const p = previewRes.data;

      if (!p.canPermanentlyDelete) {
        // Show blocker panel
        if (pdelBlocker) pdelBlocker.classList.remove('hidden');
        if (pdelBlockList) {
          const h = p.blockingHistoricalData;
          pdelBlockList.innerHTML = [
            h.registrations     ? _pdelBlockRow('assignment', `Dossiers d'inscription`, h.registrations) : '',
            h.acceptedRegistrations ? _pdelBlockRow('how_to_reg', `Inscriptions acceptées`, h.acceptedRegistrations) : '',
            h.waitingListEntries ? _pdelBlockRow('queue', `Entrées liste d'attente`, h.waitingListEntries) : '',
            h.studentDocuments  ? _pdelBlockRow('description', `Documents élèves`, h.studentDocuments) : '',
          ].join('');
        }
      } else {
        // Show allowed panel + config breakdown
        if (pdelAllowed) pdelAllowed.classList.remove('hidden');
        if (pdelConfigList) {
          const c = p.configurationToDelete;
          const rows = [
            _pdelConfigRow('school', `Niveaux d'enseignement assignés`, c.levelAssignments),
            _pdelConfigRow('gauge', `Configurations de capacité`, c.capacities),
            _pdelConfigRow('payments', `Tarifs`, c.tariffs),
            _pdelConfigRow('checklist', `Exigences documentaires`, c.documentRequirements),
            _pdelConfigRow('image', `Médias assignés`, c.mediaAssignments),
          ].filter(Boolean).join('');
          pdelConfigList.innerHTML = rows || '<p class="text-xs text-muted">Aucune donnée de configuration à supprimer.</p>';
        }
        if (pdelBtnConfirm) pdelBtnConfirm.style.display = 'inline-flex';
      }
    } catch (err) {
      showAdminToast('Erreur lors du chargement de l\'aperçu.', 'error');
      _pdelClose();
    }
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('school-name')?.value.trim();
      const code = document.getElementById('school-code')?.value.trim();
      const address = document.getElementById('school-address')?.value.trim();
      const wilaya = document.getElementById('school-wilaya')?.value.trim();
      const commune = document.getElementById('school-commune')?.value.trim();
      const phone = document.getElementById('school-phone')?.value.trim();
      const whatsapp = document.getElementById('school-whatsapp')?.value.trim();
      const email = document.getElementById('school-email')?.value.trim();
      const mapsUrl = document.getElementById('school-google-maps-url')?.value.trim();
      const latVal = document.getElementById('school-latitude')?.value.trim();
      const lngVal = document.getElementById('school-longitude')?.value.trim();
      const isMapPublic = document.getElementById('school-is-map-public')?.checked ?? true;
      const status = document.getElementById('school-status')?.value || 'ACTIVE';

      if (!name || !code) {
        showAdminToast('Le nom et le code unique sont obligatoires.', 'error');
        return;
      }

      if (mapsUrl && !mapsUrl.startsWith('https://') && !mapsUrl.startsWith('http://')) {
        showAdminToast('L’URL Google Maps doit débuter par https://', 'error');
        return;
      }

      let lat = latVal ? parseFloat(latVal) : null;
      let lng = lngVal ? parseFloat(lngVal) : null;

      if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
        showAdminToast('La latitude doit être un nombre entre -90 et 90.', 'error');
        return;
      }
      if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
        showAdminToast('La longitude doit être un nombre entre -180 et 180.', 'error');
        return;
      }

      const payload = {
        name,
        code,
        address: address || null,
        wilaya: wilaya || null,
        commune: commune || null,
        phonePrimary: phone || null,
        whatsapp: whatsapp || null,
        emailPrimary: email || null,
        googleMapsUrl: mapsUrl || null,
        latitude: lat,
        longitude: lng,
        isMapPublic,
        status
      };

      const editId = form.dataset.editId;
      const url = editId ? `/admin/schools/${editId}` : '/admin/schools';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
        if (res.success) {
          showAdminToast(editId ? 'Établissement mis à jour avec succès.' : 'Établissement créé avec succès.', 'success');
          modal.classList.remove('open');
          loadSchools(currentSchoolTab);
        } else {
          // If duplicate code of an archived school, provide actionable toast
          const meta = res.error?.details || res.error?.data;
          if (meta?.isArchived && meta?.existingSchoolId) {
            showAdminToast(res.error?.message || 'Un établissement archivé utilise ce code.', 'warning');
            if (confirm(`Un établissement archivé ("${meta.name || meta.code}") utilise déjà ce code.\n\nVoulez-vous restaurer cet établissement existant ?`)) {
              await window.restoreSchool(meta.existingSchoolId, meta.name || meta.code);
              modal.classList.remove('open');
              window.switchSchoolTab('ACTIVE');
            }
          } else {
            showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
          }
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  loadSchools(currentSchoolTab);
}

// ── NIVEAUX & CAPACITES ──
async function initNiveauxCapacites() {
  // ── Tab Management ──
  const tabBtnTree = document.getElementById('tab-btn-tree');
  const tabBtnTransitions = document.getElementById('tab-btn-transitions');
  const tabBtnCapacities = document.getElementById('tab-btn-capacities');

  const paneTree = document.getElementById('pane-tree');
  const paneTransitions = document.getElementById('pane-transitions');
  const paneCapacities = document.getElementById('pane-capacities');

  function switchTab(activeTab) {
    [tabBtnTree, tabBtnTransitions, tabBtnCapacities].forEach(b => b?.classList.remove('active'));
    [paneTree, paneTransitions, paneCapacities].forEach(p => p?.classList.add('hidden'));

    if (activeTab === 'tree') {
      tabBtnTree?.classList.add('active');
      paneTree?.classList.remove('hidden');
      loadEducationTree();
    } else if (activeTab === 'transitions') {
      tabBtnTransitions?.classList.add('active');
      paneTransitions?.classList.remove('hidden');
      loadTransitions();
    } else if (activeTab === 'capacities') {
      tabBtnCapacities?.classList.add('active');
      paneCapacities?.classList.remove('hidden');
      loadCapacities();
    }
  }

  if (tabBtnTree) tabBtnTree.onclick = () => switchTab('tree');
  if (tabBtnTransitions) tabBtnTransitions.onclick = () => switchTab('transitions');
  if (tabBtnCapacities) tabBtnCapacities.onclick = () => switchTab('capacities');

  // ── Modals & Controls References ──
  const modalCycle = document.getElementById('modal-cycle');
  const formCycle = document.getElementById('form-cycle');
  const btnCloseCycle = document.getElementById('btn-close-cycle-modal');
  const btnCancelCycle = document.getElementById('btn-cancel-cycle');
  const btnAddCycle = document.getElementById('btn-add-cycle');

  const modalLevel = document.getElementById('modal-level');
  const formLevel = document.getElementById('form-level');
  const btnCloseLevel = document.getElementById('btn-close-level-modal');
  const btnCancelLevel = document.getElementById('btn-cancel-level');
  const btnAddLevelGlobal = document.getElementById('btn-add-level-global');

  const modalChoice = document.getElementById('modal-choice');
  const formChoice = document.getElementById('form-choice');
  const btnCloseChoice = document.getElementById('btn-close-choice-modal');
  const btnCancelChoice = document.getElementById('btn-cancel-choice');

  const modalTransition = document.getElementById('modal-transition');
  const formTransition = document.getElementById('form-transition');
  const btnCloseTransition = document.getElementById('btn-close-transition-modal');
  const btnCancelTransition = document.getElementById('btn-cancel-transition');
  const btnAddTransition = document.getElementById('btn-add-transition');

  const modalCap = document.getElementById('modal-edit-capacity');
  const formCap = document.getElementById('form-edit-capacity');
  const btnCloseCap = document.getElementById('btn-close-cap-modal');
  const btnCancelCap = document.getElementById('btn-cancel-cap');

  const modalAddSYL = document.getElementById('modal-add-level');
  const formAddSYL = document.getElementById('form-add-level');
  const btnCloseAddSYL = document.getElementById('btn-close-add-level-modal');
  const btnCancelAddSYL = document.getElementById('btn-cancel-add-level');
  const btnAddSYL = document.getElementById('btn-add-level-offering');

  // Generic modal closers
  if (btnCloseCycle && modalCycle) btnCloseCycle.onclick = () => modalCycle.classList.remove('open');
  if (btnCancelCycle && modalCycle) btnCancelCycle.onclick = () => modalCycle.classList.remove('open');
  if (btnCloseLevel && modalLevel) btnCloseLevel.onclick = () => modalLevel.classList.remove('open');
  if (btnCancelLevel && modalLevel) btnCancelLevel.onclick = () => modalLevel.classList.remove('open');
  if (btnCloseChoice && modalChoice) btnCloseChoice.onclick = () => modalChoice.classList.remove('open');
  if (btnCancelChoice && modalChoice) btnCancelChoice.onclick = () => modalChoice.classList.remove('open');
  if (btnCloseTransition && modalTransition) btnCloseTransition.onclick = () => modalTransition.classList.remove('open');
  if (btnCancelTransition && modalTransition) btnCancelTransition.onclick = () => modalTransition.classList.remove('open');
  if (btnCloseCap && modalCap) btnCloseCap.onclick = () => modalCap.classList.remove('open');
  if (btnCancelCap && modalCap) btnCancelCap.onclick = () => modalCap.classList.remove('open');
  if (btnCloseAddSYL && modalAddSYL) btnCloseAddSYL.onclick = () => modalAddSYL.classList.remove('open');
  if (btnCancelAddSYL && modalAddSYL) btnCancelAddSYL.onclick = () => modalAddSYL.classList.remove('open');

  // ── Global cached data ──
  let cachedTree = [];
  let cachedCycles = [];
  let cachedLevels = [];

  // =========================================================================
  // TAB 1: ARBORESCENCE PÉDAGOGIQUE (CYCLES -> NIVEAUX -> CHOIX / FILIÈRES)
  // =========================================================================

  async function loadEducationTree() {
    const container = document.getElementById('edu-tree-container');
    if (!container) return;

    try {
      const res = await adminFetch('/admin/cycles/tree?includeInactive=true');
      if (!res.success || !res.data) {
        container.innerHTML = `<div class="card p-6 text-center text-error">Erreur de chargement de l'arborescence pédagogique.</div>`;
        return;
      }

      cachedTree = res.data;
      cachedCycles = res.data.map(c => ({ id: c.id, code: c.code, nameFr: c.nameFr }));
      cachedLevels = [];
      res.data.forEach(c => {
        if (c.levels) {
          c.levels.forEach(l => {
            cachedLevels.push({ id: l.id, cycleId: c.id, code: l.code, nameFr: l.nameFr, choices: l.choices || [] });
          });
        }
      });

      if (cachedTree.length === 0) {
        container.innerHTML = `
          <div class="card p-8 text-center text-muted">
            <span class="material-symbols-outlined text-4xl mb-2">account_tree</span>
            <p>Aucun cycle éducatif configuré.</p>
            <button class="btn btn-primary btn-sm mt-3" onclick="window.openAddCycleModal()">Créer le premier cycle</button>
          </div>
        `;
        return;
      }

      // Render Tree
      container.innerHTML = cachedTree.map(cycle => `
        <div class="edu-cycle-card">
          <div class="edu-cycle-header">
            <div class="flex items-center gap-3">
              <span class="badge ${cycle.isActive ? 'badge-accepted' : 'badge-inactive'} font-mono">${cycle.code}</span>
              <div>
                <span class="font-bold text-base text-primary">${cycle.nameFr}</span>
                ${cycle.nameAr ? `<span class="text-sm text-muted ml-2" dir="rtl">(${cycle.nameAr})</span>` : ''}
              </div>
              <span class="text-xs text-muted">Ordre: ${cycle.displayOrder}</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-outline btn-xs" onclick="window.openAddLevelModal('${cycle.id}', '${cycle.nameFr.replace(/'/g, "\\'")}')">
                <span class="material-symbols-outlined" style="font-size:14px;">add</span> Niveau
              </button>
              <button class="btn btn-outline btn-xs" onclick="window.openEditCycleModal('${cycle.id}')" title="Modifier le cycle">
                <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
              </button>
              <button class="btn btn-outline btn-xs text-error" onclick="window.deleteCycle('${cycle.id}', '${cycle.nameFr.replace(/'/g, "\\'")}')" title="Supprimer le cycle">
                <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
              </button>
            </div>
          </div>

          <div class="edu-levels-container">
            ${(!cycle.levels || cycle.levels.length === 0)
              ? `<div class="text-sm text-muted italic py-2">Aucun niveau configuré dans ce cycle.</div>`
              : cycle.levels.map(lvl => `
                <div class="edu-level-item">
                  <div class="edu-level-header">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-accepted font-mono text-xs">${lvl.code}</span>
                      <span class="font-semibold text-sm text-slate-800">${lvl.nameFr}</span>
                      ${lvl.nameAr ? `<span class="text-xs text-muted" dir="rtl">(${lvl.nameAr})</span>` : ''}
                      <span class="text-xs text-slate-400">• Ordre: ${lvl.displayOrder}</span>
                      ${!lvl.isActive ? `<span class="badge badge-inactive text-xs">Inactif</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="btn btn-outline btn-xs" onclick="window.openAddChoiceModal('${lvl.id}', null, '${lvl.nameFr.replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined" style="font-size:14px;">add</span> Filière / Choix
                      </button>
                      <button class="btn btn-outline btn-xs" onclick="window.openEditLevelModal('${lvl.id}')" title="Modifier le niveau">
                        <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
                      </button>
                      <button class="btn btn-outline btn-xs text-error" onclick="window.deleteLevel('${lvl.id}', '${lvl.nameFr.replace(/'/g, "\\'")}')" title="Supprimer le niveau">
                        <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
                      </button>
                    </div>
                  </div>

                  ${renderChoicesTree(lvl.choices, lvl.id, lvl.nameFr)}
                </div>
              `).join('')
            }
          </div>
        </div>
      `).join('');

    } catch (err) {
      container.innerHTML = `<div class="card p-6 text-center text-error">Erreur lors de la récupération des données pédagogiques.</div>`;
    }
  }

  // Recursive renderer for choices and sub-choices
  function renderChoicesTree(choices, levelId, levelName, isNested = false) {
    if (!choices || choices.length === 0) {
      return isNested ? '' : `<div class="text-xs text-muted italic mt-2 pl-4">Tronc commun standard (aucun choix ou filière).</div>`;
    }

    const listClass = isNested ? 'edu-subchoices-list' : 'edu-choices-list';
    const badgeClass = isNested ? 'edu-subchoice-badge' : 'edu-choice-badge';

    return `
      <div class="${listClass}">
        ${choices.map(c => `
          <div>
            <div class="${badgeClass}">
              <div class="flex items-center gap-2">
                <span class="badge ${c.nodeType === 'CHOICE' ? 'badge-accepted' : 'badge-inactive'} text-xs">${c.nodeType || 'CHOICE'}</span>
                <span class="font-medium text-slate-800">${c.nameFr}</span>
                <code class="text-xs text-slate-500 font-mono">[${c.code}]</code>
                ${c.nameAr ? `<span class="text-xs text-muted" dir="rtl">(${c.nameAr})</span>` : ''}
              </div>
              <div class="flex items-center gap-1">
                <button class="btn btn-outline btn-xs" onclick="window.openAddChoiceModal('${levelId}', '${c.id}', '${c.nameFr.replace(/'/g, "\\'")}')" title="Ajouter une sous-option / spécialité">
                  <span class="material-symbols-outlined" style="font-size:13px;">subdirectory_arrow_right</span> Sous-choix
                </button>
                <button class="btn btn-outline btn-xs" onclick="window.openEditChoiceModal('${c.id}')" title="Modifier le choix">
                  <span class="material-symbols-outlined" style="font-size:13px;">edit</span>
                </button>
                <button class="btn btn-outline btn-xs text-error" onclick="window.deleteChoice('${c.id}', '${c.nameFr.replace(/'/g, "\\'")}')" title="Supprimer le choix">
                  <span class="material-symbols-outlined" style="font-size:13px;">delete</span>
                </button>
              </div>
            </div>
            ${c.children && c.children.length > 0 ? renderChoicesTree(c.children, levelId, levelName, true) : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  const btnRefreshTree = document.getElementById('btn-refresh-tree');
  if (btnRefreshTree) btnRefreshTree.onclick = () => loadEducationTree();

  // ── Cycle Actions ──
  window.openAddCycleModal = () => {
    if (!modalCycle || !formCycle) return;
    formCycle.reset();
    document.getElementById('cycle-id').value = '';
    document.getElementById('modal-cycle-title').textContent = 'Nouveau Cycle Éducatif';
    document.getElementById('cycle-code').disabled = false;
    modalCycle.classList.add('open');
  };

  if (btnAddCycle) btnAddCycle.onclick = () => window.openAddCycleModal();

  window.openEditCycleModal = (cycleId) => {
    const cycle = cachedTree.find(c => c.id === cycleId);
    if (!cycle || !modalCycle || !formCycle) return;
    formCycle.reset();
    document.getElementById('cycle-id').value = cycle.id;
    document.getElementById('cycle-code').value = cycle.code;
    document.getElementById('cycle-code').disabled = true;
    document.getElementById('cycle-name-fr').value = cycle.nameFr;
    document.getElementById('cycle-name-ar').value = cycle.nameAr || '';
    document.getElementById('cycle-order').value = cycle.displayOrder || 10;
    document.getElementById('modal-cycle-title').textContent = 'Modifier le Cycle : ' + cycle.nameFr;
    modalCycle.classList.add('open');
  };

  window.deleteCycle = async (cycleId, cycleName) => {
    if (!confirm(`Voulez-vous supprimer le cycle "${cycleName}" ? S'il contient des niveaux ou des inscriptions historiques, il sera désactivé en toute sécurité.`)) return;
    try {
      const res = await adminFetch(`/admin/cycles-levels/cycles/${cycleId}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(res.data?.message || 'Cycle supprimé avec succès.', 'success');
        loadEducationTree();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  if (formCycle) {
    formCycle.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cycle-id').value;
      const code = document.getElementById('cycle-code').value.trim();
      const nameFr = document.getElementById('cycle-name-fr').value.trim();
      const nameAr = document.getElementById('cycle-name-ar').value.trim() || null;
      const displayOrder = parseInt(document.getElementById('cycle-order').value, 10) || 10;

      if (!nameFr || (!id && !code)) {
        showAdminToast('Veuillez renseigner les champs obligatoires.', 'error');
        return;
      }

      try {
        const url = id ? `/admin/cycles-levels/cycles/${id}` : '/admin/cycles-levels/cycles';
        const method = id ? 'PUT' : 'POST';
        const body = id ? { nameFr, nameAr, displayOrder } : { code, nameFr, nameAr, displayOrder };

        const res = await adminFetch(url, { method, body: JSON.stringify(body) });
        if (res.success) {
          showAdminToast(id ? 'Cycle mis à jour avec succès.' : 'Cycle créé avec succès.', 'success');
          modalCycle.classList.remove('open');
          loadEducationTree();
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  // ── Level Actions ──
  function populateLevelCycleSelect(selectedCycleId) {
    const sel = document.getElementById('level-cycle-id');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sélectionner un cycle…</option>' +
      cachedCycles.map(c => `<option value="${c.id}" ${c.id === selectedCycleId ? 'selected' : ''}>${c.nameFr} (${c.code})</option>`).join('');
  }

  window.openAddLevelModal = (cycleId = '', cycleName = '') => {
    if (!modalLevel || !formLevel) return;
    formLevel.reset();
    document.getElementById('level-id').value = '';
    populateLevelCycleSelect(cycleId);
    document.getElementById('level-code').disabled = false;
    document.getElementById('modal-level-title').textContent = cycleName ? `Nouveau Niveau dans "${cycleName}"` : 'Nouveau Niveau Scolaire';
    modalLevel.classList.add('open');
  };

  if (btnAddLevelGlobal) btnAddLevelGlobal.onclick = () => window.openAddLevelModal();

  window.openEditLevelModal = (levelId) => {
    const level = cachedLevels.find(l => l.id === levelId);
    if (!level || !modalLevel || !formLevel) return;
    formLevel.reset();
    document.getElementById('level-id').value = level.id;
    populateLevelCycleSelect(level.cycleId);
    document.getElementById('level-cycle-id').disabled = true;
    document.getElementById('level-code').value = level.code;
    document.getElementById('level-code').disabled = true;
    document.getElementById('level-name-fr').value = level.nameFr;
    document.getElementById('level-order').value = level.displayOrder || 10;
    document.getElementById('modal-level-title').textContent = 'Modifier le Niveau : ' + level.nameFr;
    modalLevel.classList.add('open');
  };

  window.deleteLevel = async (levelId, levelName) => {
    if (!confirm(`Voulez-vous supprimer le niveau "${levelName}" ? S'il contient des inscriptions historiques, il sera désactivé en toute sécurité.`)) return;
    try {
      const res = await adminFetch(`/admin/cycles-levels/levels/${levelId}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(res.data?.message || 'Niveau supprimé avec succès.', 'success');
        loadEducationTree();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  if (formLevel) {
    formLevel.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('level-id').value;
      const cycleId = document.getElementById('level-cycle-id').value;
      const code = document.getElementById('level-code').value.trim();
      const nameFr = document.getElementById('level-name-fr').value.trim();
      const nameAr = document.getElementById('level-name-ar').value.trim() || null;
      const displayOrder = parseInt(document.getElementById('level-order').value, 10) || 10;

      if (!nameFr || (!id && (!cycleId || !code))) {
        showAdminToast('Veuillez renseigner les champs obligatoires.', 'error');
        return;
      }

      try {
        const url = id ? `/admin/cycles-levels/levels/${id}` : '/admin/cycles-levels/levels';
        const method = id ? 'PUT' : 'POST';
        const body = id ? { nameFr, nameAr, displayOrder } : { cycleId, code, nameFr, nameAr, displayOrder };

        const res = await adminFetch(url, { method, body: JSON.stringify(body) });
        if (res.success) {
          showAdminToast(id ? 'Niveau mis à jour avec succès.' : 'Niveau créé avec succès.', 'success');
          modalLevel.classList.remove('open');
          document.getElementById('level-cycle-id').disabled = false;
          loadEducationTree();
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  // ── Choice / Filière Actions ──
  window.openAddChoiceModal = (levelId, parentId = null, parentName = '') => {
    if (!modalChoice || !formChoice) return;
    formChoice.reset();
    document.getElementById('choice-id').value = '';
    document.getElementById('choice-level-id').value = levelId;
    document.getElementById('choice-parent-id').value = parentId || '';
    document.getElementById('choice-code').disabled = false;

    const info = parentId ? `Sous-choix rattaché à : ${parentName}` : `Filière rattachée au niveau : ${parentName}`;
    document.getElementById('choice-parent-info').textContent = info;
    document.getElementById('modal-choice-title').textContent = parentId ? 'Nouveau Sous-choix / Spécialité' : 'Nouvelle Filière / Option';
    document.getElementById('choice-type').value = parentId ? 'SPECIALITY' : 'CHOICE';

    modalChoice.classList.add('open');
  };

  window.openEditChoiceModal = async (choiceId) => {
    if (!modalChoice || !formChoice) return;
    try {
      const res = await adminFetch(`/admin/choices/${choiceId}`);
      if (!res.success || !res.data) {
        showAdminToast('Choix introuvable.', 'error');
        return;
      }
      const c = res.data;
      formChoice.reset();
      document.getElementById('choice-id').value = c.id;
      document.getElementById('choice-level-id').value = c.levelId;
      document.getElementById('choice-parent-id').value = c.parentId || '';
      document.getElementById('choice-code').value = c.code;
      document.getElementById('choice-code').disabled = true;
      document.getElementById('choice-type').value = c.nodeType || 'CHOICE';
      document.getElementById('choice-name-fr').value = c.nameFr;
      document.getElementById('choice-name-ar').value = c.nameAr || '';
      document.getElementById('choice-description').value = c.description || '';
      document.getElementById('choice-order').value = c.displayOrder || 10;
      document.getElementById('choice-parent-info').textContent = `Modification de : ${c.nameFr}`;
      document.getElementById('modal-choice-title').textContent = 'Modifier : ' + c.nameFr;
      modalChoice.classList.add('open');
    } catch (err) {
      showAdminToast('Erreur chargement choix.', 'error');
    }
  };

  window.deleteChoice = async (choiceId, choiceName) => {
    if (!confirm(`Voulez-vous supprimer le choix "${choiceName}" ? S'il contient des inscriptions ou sous-choix, il sera désactivé en toute sécurité.`)) return;
    try {
      const res = await adminFetch(`/admin/choices/${choiceId}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(res.data?.message || 'Choix supprimé avec succès.', 'success');
        loadEducationTree();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  if (formChoice) {
    formChoice.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('choice-id').value;
      const levelId = document.getElementById('choice-level-id').value;
      const parentId = document.getElementById('choice-parent-id').value || null;
      const code = document.getElementById('choice-code').value.trim();
      const nameFr = document.getElementById('choice-name-fr').value.trim();
      const nameAr = document.getElementById('choice-name-ar').value.trim() || null;
      const description = document.getElementById('choice-description').value.trim() || null;
      const nodeType = document.getElementById('choice-type').value;
      const displayOrder = parseInt(document.getElementById('choice-order').value, 10) || 10;

      if (!nameFr || (!id && (!levelId || !code))) {
        showAdminToast('Veuillez renseigner les champs obligatoires.', 'error');
        return;
      }

      try {
        const url = id ? `/admin/choices/${id}` : '/admin/choices';
        const method = id ? 'PUT' : 'POST';
        const body = id ? { nameFr, nameAr, description, nodeType, displayOrder } : { levelId, parentId, code, nameFr, nameAr, description, nodeType, displayOrder };

        const res = await adminFetch(url, { method, body: JSON.stringify(body) });
        if (res.success) {
          showAdminToast(id ? 'Choix mis à jour avec succès.' : 'Choix créé avec succès.', 'success');
          modalChoice.classList.remove('open');
          loadEducationTree();
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  // =========================================================================
  // TAB 2: RÈGLES D'ORIENTATION & PROGRESSION
  // =========================================================================

  async function loadTransitions() {
    const tbody = document.getElementById('transitions-tbody');
    if (!tbody) return;

    try {
      const res = await adminFetch('/admin/transitions');
      if (!res.success || !res.data) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error py-6">Erreur chargement des règles.</td></tr>`;
        return;
      }

      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-8">Aucune règle de progression définie (mode permissif actif).</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(t => `
        <tr>
          <td><span class="badge badge-accepted font-mono">${t.fromLevel?.code || '—'}</span> <span class="font-semibold text-sm">${t.fromLevel?.nameFr || ''}</span></td>
          <td>${t.fromChoice ? `<span class="badge font-mono">${t.fromChoice.code}</span> ${t.fromChoice.nameFr}` : '<span class="text-xs text-muted">Toutes filières</span>'}</td>
          <td style="text-align: center; color: var(--primary); font-size: 18px;">➔</td>
          <td><span class="badge badge-accepted font-mono">${t.toLevel?.code || '—'}</span> <span class="font-semibold text-sm">${t.toLevel?.nameFr || ''}</span></td>
          <td>${t.toChoice ? `<span class="badge font-mono">${t.toChoice.code}</span> ${t.toChoice.nameFr}` : '<span class="text-xs text-muted">Tronc standard / libre</span>'}</td>
          <td class="text-xs text-muted">${t.notes || '—'}</td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-xs text-error" onclick="window.deleteTransition('${t.id}')" title="Supprimer la règle">
              <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error py-6">Erreur serveur lors de la récupération des règles.</td></tr>`;
    }
  }

  // Populate level dropdowns for transition modal
  async function prepareTransitionModal() {
    const fromLevelSel = document.getElementById('trans-from-level');
    const toLevelSel = document.getElementById('trans-to-level');
    const fromChoiceSel = document.getElementById('trans-from-choice');
    const toChoiceSel = document.getElementById('trans-to-choice');

    if (!fromLevelSel || !toLevelSel) return;

    const levelOptions = '<option value="">Sélectionner un niveau…</option>' +
      cachedLevels.map(l => `<option value="${l.id}">${l.nameFr} (${l.code})</option>`).join('');

    fromLevelSel.innerHTML = levelOptions;
    toLevelSel.innerHTML = levelOptions;
    fromChoiceSel.innerHTML = '<option value="">Toutes filières confondues</option>';
    toChoiceSel.innerHTML = '<option value="">Pas de filière spécifique</option>';

    fromLevelSel.onchange = async () => {
      const lvlId = fromLevelSel.value;
      if (!lvlId) {
        fromChoiceSel.innerHTML = '<option value="">Toutes filières confondues</option>';
        return;
      }
      try {
        const res = await adminFetch(`/admin/choices/by-level/${lvlId}/flat`);
        if (res.success && res.data) {
          fromChoiceSel.innerHTML = '<option value="">Toutes filières confondues</option>' +
            res.data.map(c => `<option value="${c.id}">${c.nameFr} (${c.code})</option>`).join('');
        }
      } catch (err) {}
    };

    toLevelSel.onchange = async () => {
      const lvlId = toLevelSel.value;
      if (!lvlId) {
        toChoiceSel.innerHTML = '<option value="">Pas de filière spécifique</option>';
        return;
      }
      try {
        const res = await adminFetch(`/admin/choices/by-level/${lvlId}/flat`);
        if (res.success && res.data) {
          toChoiceSel.innerHTML = '<option value="">Pas de filière spécifique</option>' +
            res.data.map(c => `<option value="${c.id}">${c.nameFr} (${c.code})</option>`).join('');
        }
      } catch (err) {}
    };
  }

  if (btnAddTransition) {
    btnAddTransition.onclick = () => {
      if (formTransition) formTransition.reset();
      prepareTransitionModal();
      modalTransition?.classList.add('open');
    };
  }

  window.deleteTransition = async (transitionId) => {
    if (!confirm('Voulez-vous supprimer cette règle de transition / progression ?')) return;
    try {
      const res = await adminFetch(`/admin/transitions/${transitionId}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast('Règle supprimée avec succès.', 'success');
        loadTransitions();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  if (formTransition) {
    formTransition.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fromLevelId = document.getElementById('trans-from-level')?.value;
      const fromChoiceId = document.getElementById('trans-from-choice')?.value || null;
      const toLevelId = document.getElementById('trans-to-level')?.value;
      const toChoiceId = document.getElementById('trans-to-choice')?.value || null;
      const notes = document.getElementById('trans-notes')?.value.trim() || null;

      if (!fromLevelId || !toLevelId) {
        showAdminToast('Niveau d\'origine et niveau de destination obligatoires.', 'error');
        return;
      }

      try {
        const res = await adminFetch('/admin/transitions', {
          method: 'POST',
          body: JSON.stringify({ fromLevelId, fromChoiceId, toLevelId, toChoiceId, notes })
        });
        if (res.success) {
          showAdminToast('Règle d\'orientation créée avec succès.', 'success');
          modalTransition?.classList.remove('open');
          loadTransitions();
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de la création.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  // =========================================================================
  // TAB 3: CAPACITÉS & QUOTAS PAR ÉTABLISSEMENT
  // =========================================================================

  const tbodyCap = document.getElementById('capacities-tbody');
  const filterSchool = document.getElementById('filter-cap-school');
  const filterCycle = document.getElementById('filter-cap-cycle');
  const filterStatus = document.getElementById('filter-cap-status');

  // Populate dynamic filters
  async function populateCapacityFilters() {
    try {
      const [schoolsRes, cyclesRes] = await Promise.all([
        adminFetch('/admin/schools'),
        adminFetch('/admin/cycles-levels/cycles')
      ]);

      if (schoolsRes.success && schoolsRes.data && filterSchool) {
        filterSchool.innerHTML = '<option value="">Tous les établissements</option>' +
          schoolsRes.data.filter(s => s.isActive).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }

      if (cyclesRes.success && cyclesRes.data && filterCycle) {
        filterCycle.innerHTML = '<option value="">Tous les cycles</option>' +
          cyclesRes.data.filter(c => c.isActive).map(c => `<option value="${c.id}">${c.nameFr} (${c.code})</option>`).join('');
      }
    } catch (err) {}
  }

  if (filterSchool) filterSchool.onchange = () => loadCapacities();
  if (filterCycle) filterCycle.onchange = () => loadCapacities();
  if (filterStatus) filterStatus.onchange = () => loadCapacities();

  async function loadCapacities() {
    if (!tbodyCap) return;
    try {
      const params = new URLSearchParams();
      if (filterSchool?.value) params.append('schoolId', filterSchool.value);
      if (filterCycle?.value) params.append('cycleId', filterCycle.value);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await adminFetch(`/admin/school-year-levels${qs}`);
      if (res.success && res.data) {
        let items = res.data;

        // Local filter for availability if selected
        if (filterStatus?.value === 'AVAILABLE') {
          items = items.filter(i => {
            const max = i.capacity?.capacityMax || 250;
            const accepted = i.capacity?.acceptedCount || 0;
            return (accepted / max) < 0.9;
          });
        } else if (filterStatus?.value === 'LIMITED') {
          items = items.filter(i => {
            const max = i.capacity?.capacityMax || 250;
            const accepted = i.capacity?.acceptedCount || 0;
            const pct = (accepted / max);
            return pct >= 0.9 && pct < 1.0;
          });
        } else if (filterStatus?.value === 'FULL') {
          items = items.filter(i => {
            const max = i.capacity?.capacityMax || 250;
            const accepted = i.capacity?.acceptedCount || 0;
            return accepted >= max;
          });
        }

        if (items.length === 0) {
          tbodyCap.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-8">Aucun niveau d'enseignement configuré pour ces critères.</td></tr>`;
          return;
        }

        tbodyCap.innerHTML = items.map(item => {
          const max = item.capacity?.capacityMax || 250;
          const accepted = item.capacity?.acceptedCount || 0;
          const remaining = Math.max(0, max - accepted);
          const pct = Math.min(100, Math.round((accepted / max) * 100));

          return `
            <tr>
              <td class="font-semibold">${item.levelNameFr || item.level?.name || 'Niveau'}</td>
              <td>${item.cycleNameFr || item.cycle || '—'}</td>
              <td>${item.schoolName || item.school?.name || 'Campus Principal'}</td>
              <td style="text-align: right; font-weight: bold;">${max}</td>
              <td style="text-align: right; color: var(--success); font-weight: bold;">${accepted}</td>
              <td style="text-align: right; color: var(--indigo); font-weight: bold;">${remaining}</td>
              <td>
                <div class="capacity-bar">
                  <div class="capacity-bar-fill ${pct >= 100 ? 'full' : pct >= 90 ? 'warn' : ''}" style="width: ${pct}%;"></div>
                </div>
                <div class="text-xs text-muted mt-1 text-center">${pct}%</div>
              </td>
              <td><span class="badge ${item.registrationOpen ? 'badge-accepted' : 'badge-inactive'}">${item.registrationOpen ? 'Ouvert' : 'Fermé'}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-outline btn-xs" onclick="window.editCapacity('${item.id}', '${item.levelNameFr || ''}', ${max}, ${item.registrationOpen})">
                  <span class="material-symbols-outlined" style="font-size:14px;">tune</span> Régler
                </button>
                <button class="btn btn-outline btn-xs text-error ml-1" onclick="window.deleteSchoolYearLevel('${item.id}')" title="Supprimer / Archiver">
                  <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      tbodyCap.innerHTML = `<tr><td colspan="9" class="text-center text-error py-6">Erreur lors de la récupération des capacités.</td></tr>`;
    }
  }

  // Populate dropdowns for add school_year_level offering modal
  async function prepareAddOfferingModal() {
    try {
      const [schoolsRes, levelsRes, yearsRes] = await Promise.all([
        adminFetch('/admin/schools'),
        adminFetch('/admin/levels'),
        adminFetch('/admin/academic-years')
      ]);
      const addSchoolSel = document.getElementById('add-level-school');
      const addLevelSel = document.getElementById('add-level-level');
      const addYearSel = document.getElementById('add-level-year');
      if (schoolsRes.success && schoolsRes.data && addSchoolSel) {
        addSchoolSel.innerHTML = '<option value="">Sélectionner un établissement…</option>' +
          schoolsRes.data.filter(s => s.isActive).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
      if (levelsRes.success && levelsRes.data && addLevelSel) {
        addLevelSel.innerHTML = '<option value="">Sélectionner un niveau…</option>' +
          levelsRes.data.map(l => `<option value="${l.id}">${l.nameFr || l.name} (${l.code})</option>`).join('');
      }
      if (yearsRes.success && yearsRes.data && addYearSel) {
        addYearSel.innerHTML = '<option value="">Sélectionner une année scolaire…</option>' +
          yearsRes.data.map(y => `<option value="${y.id}" ${y.status === 'ACTIVE' ? 'selected' : ''}>${y.name}</option>`).join('');
      }
    } catch (err) {}
  }

  if (btnAddSYL && modalAddSYL) {
    btnAddSYL.onclick = () => {
      if (formAddSYL) formAddSYL.reset();
      prepareAddOfferingModal();
      modalAddSYL.classList.add('open');
    };
  }

  if (formAddSYL) {
    formAddSYL.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        schoolId: document.getElementById('add-level-school')?.value,
        levelId: document.getElementById('add-level-level')?.value,
        academicYearId: document.getElementById('add-level-year')?.value,
        capacityMax: parseInt(document.getElementById('add-level-capacity')?.value, 10) || 200,
        registrationOpen: document.getElementById('add-level-open')?.checked ?? false,
        isVisibleClient: true,
      };
      if (!payload.schoolId || !payload.levelId || !payload.academicYearId) {
        showAdminToast('Établissement, niveau et année scolaire sont obligatoires.', 'error');
        return;
      }
      try {
        const res = await adminFetch('/admin/school-year-levels', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
          showAdminToast('Niveau assigné à l\'établissement avec succès.', 'success');
          modalAddSYL.classList.remove('open');
          loadCapacities();
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'ajout.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  window.editCapacity = (id, name, max, isOpen) => {
    document.getElementById('cap-level-id').value = id;
    document.getElementById('cap-level-info').textContent = name;
    document.getElementById('cap-max-input').value = max;
    document.getElementById('cap-status-select').value = isOpen ? 'OPEN' : 'CLOSED';
    if (modalCap) modalCap.classList.add('open');
  };

  window.deleteSchoolYearLevel = async (id) => {
    if (!confirm('Voulez-vous supprimer ou désactiver ce niveau pour cet établissement ?')) return;
    try {
      const res = await adminFetch(`/admin/school-year-levels/${id}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast(res.data?.message || 'Niveau supprimé / archivé.', 'info');
        loadCapacities();
      } else {
        showAdminToast(res.error?.message || 'Erreur suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  if (formCap) {
    formCap.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cap-level-id').value;
      const capacityMax = parseInt(document.getElementById('cap-max-input').value, 10);
      const isOpen = document.getElementById('cap-status-select').value === 'OPEN';

      try {
        const res = await adminFetch(`/admin/school-year-levels/${id}/capacity`, {
          method: 'PUT',
          body: JSON.stringify({ capacityMax, registrationOpen: isOpen })
        });
        if (res.success) {
          showAdminToast('Capacité mise à jour.', 'success');
          modalCap.classList.remove('open');
          loadCapacities();
        } else {
          showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  // ── Initial Boot ──
  populateCapacityFilters();
  loadEducationTree();
}

// ── ANNEES SCOLAIRES ──
async function initAnneesScolaires() {
  const tbody = document.getElementById('years-tbody');
  const btnAdd = document.getElementById('btn-add-year');
  const modal = document.getElementById('modal-year');
  const btnClose = document.getElementById('btn-close-year-modal');
  const btnCancel = document.getElementById('btn-cancel-year');
  const form = document.getElementById('form-year');

  if (btnAdd && modal) btnAdd.onclick = () => { form.reset(); modal.classList.add('open'); };
  if (btnClose && modal) btnClose.onclick = () => modal.classList.remove('open');
  if (btnCancel && modal) btnCancel.onclick = () => modal.classList.remove('open');

  async function loadYears() {
    try {
      const res = await adminFetch('/admin/academic-years');
      if (res.success && res.data && tbody) {
        tbody.innerHTML = res.data.map(y => `
          <tr>
            <td class="font-bold text-primary">${y.name}</td>
            <td>${formatDate(y.startDate)}</td>
            <td>${formatDate(y.endDate)}</td>
            <td>
              <span class="badge ${y.status === 'ACTIVE' ? 'badge-accepted' : 'badge-inactive'}">
                ${y.status === 'ACTIVE' ? 'Active' : y.status === 'ARCHIVED' ? 'Archivée' : 'Planifiée'}
              </span>
            </td>
            <td style="text-align: right;">
              ${y.status !== 'ACTIVE' ? `
                <button class="btn btn-primary btn-xs" onclick="activateYear('${y.id}')">Activer</button>
              ` : '<span class="text-xs text-muted font-semibold">Session courante</span>'}
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {}
  }

  window.activateYear = async (id) => {
    try {
      const res = await adminFetch(`/admin/academic-years/${id}/activate`, { method: 'POST' });
      if (res.success) {
        showAdminToast('Année scolaire activée.', 'success');
        loadYears();
      }
    } catch (err) {}
  };

  loadYears();
}

// ── TARIFS ──
async function initTarifs() {
  const tbody = document.getElementById('tarifs-tbody');
  const btnAdd = document.getElementById('btn-add-tariff');
  const modal = document.getElementById('modal-tariff');
  const modalTitle = document.getElementById('modal-tariff-title');
  const btnClose = document.getElementById('btn-close-tariff-modal');
  const btnCancel = document.getElementById('btn-cancel-tariff');
  const form = document.getElementById('form-tariff');
  const schoolSelect = document.getElementById('tariff-school');
  const levelSelect = document.getElementById('tariff-level');

  if (btnAdd && modal) {
    btnAdd.onclick = () => {
      form.reset();
      delete form.dataset.editId;
      if (modalTitle) modalTitle.textContent = 'Ajouter un tarif';
      modal.classList.add('open');
    };
  }
  if (btnClose && modal) btnClose.onclick = () => modal.classList.remove('open');
  if (btnCancel && modal) btnCancel.onclick = () => modal.classList.remove('open');

  try {
    const [sRes, lRes] = await Promise.all([
      adminFetch('/admin/schools'),
      adminFetch('/admin/levels')
    ]);
    if (sRes.success && sRes.data && schoolSelect) {
      schoolSelect.innerHTML = '<option value="">Sélectionner un établissement…</option>' +
        sRes.data.filter(s => s.isActive).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    if (lRes.success && lRes.data && levelSelect) {
      levelSelect.innerHTML = '<option value="">Sélectionner un niveau…</option>' +
        lRes.data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    }
  } catch (err) {}

  async function loadTarifs() {
    try {
      const res = await adminFetch('/admin/tariffs');
      if (res.success && res.data && tbody) {
        if (res.data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-muted">Aucun tarif configuré.</td></tr>`;
          return;
        }
        tbody.innerHTML = res.data.map(t => `
          <tr>
            <td class="font-semibold text-primary">${t.levelNameFr || t.levelCode || 'Scolarité'}</td>
            <td>${t.cycleNameFr || t.cycleCode || '—'}</td>
            <td>${t.schoolName || '—'}</td>
            <td style="text-align: right; font-weight: bold; color: var(--navy);">${Number(t.amount || 0).toLocaleString('fr-FR')} ${t.currency || 'DZD'}</td>
            <td>${t.periodicity === 'MONTHLY' ? 'Mensuel' : t.periodicity === 'TRIMESTER' ? 'Trimestriel' : t.periodicity === 'ONE_TIME' ? 'Frais unique' : 'Annuel'}</td>
            <td>
              <button class="badge ${t.showClient !== false ? 'badge-accepted' : 'badge-inactive'} pointer" onclick="toggleTariffVisibility('${t.id}', ${t.showClient !== false})">
                ${t.showClient !== false ? 'Visible' : 'Masqué'}
              </button>
            </td>
            <td style="text-align: right;">
              <button class="btn btn-outline btn-xs" onclick="editTarif('${t.id}')" title="Modifier">
                <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
              </button>
              <button class="btn btn-outline btn-xs text-error ml-1" onclick="deleteTarif('${t.id}')" title="Supprimer">
                <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {}
  }

  window.toggleTariffVisibility = async (id, currentVal) => {
    try {
      const res = await adminFetch(`/admin/tariffs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ showClient: !currentVal, isPublic: !currentVal })
      });
      if (res.success) {
        showAdminToast(`Visibilité modifiée : ${!currentVal ? 'Visible aux parents' : 'Masqué aux parents'}`, 'info');
        loadTarifs();
      }
    } catch (err) {}
  };

  window.editTarif = async (id) => {
    try {
      const res = await adminFetch(`/admin/tariffs`);
      if (res.success && res.data) {
        const item = res.data.find(t => t.id === id);
        if (item) {
          document.getElementById('tariff-name').value = item.levelNameFr || item.name || '';
          if (item.schoolId && schoolSelect) schoolSelect.value = item.schoolId;
          if (item.levelId && levelSelect) levelSelect.value = item.levelId;
          document.getElementById('tariff-amount').value = item.amount || 0;
          document.getElementById('tariff-period').value = item.periodicity || 'ANNUAL';
          document.getElementById('tariff-visible').checked = item.showClient !== false;
          form.dataset.editId = id;
          if (modalTitle) modalTitle.textContent = 'Modifier le tarif';
          modal.classList.add('open');
        }
      }
    } catch (err) {}
  };

  window.deleteTarif = async (id) => {
    if (!confirm('Voulez-vous supprimer ce tarif ?')) return;
    try {
      const res = await adminFetch(`/admin/tariffs/${id}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast('Tarif supprimé avec succès.', 'info');
        loadTarifs();
      } else {
        showAdminToast(res.error?.message || 'Erreur suppression.', 'error');
      }
    } catch (err) {}
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('tariff-name')?.value.trim(),
        schoolId: schoolSelect?.value,
        levelId: levelSelect?.value,
        amount: parseFloat(document.getElementById('tariff-amount')?.value) || 0,
        periodicity: document.getElementById('tariff-period')?.value || 'ANNUAL',
        showClient: document.getElementById('tariff-visible')?.checked ?? true,
        isPublic: document.getElementById('tariff-visible')?.checked ?? true
      };

      if (!payload.schoolId) {
        showAdminToast('Veuillez sélectionner un établissement.', 'error');
        return;
      }
      if (!payload.levelId && !form.dataset.editId) {
        showAdminToast('Veuillez sélectionner un niveau scolaire.', 'error');
        return;
      }

      const editId = form.dataset.editId;
      const url = editId ? `/admin/tariffs/${editId}` : '/admin/tariffs';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
        if (res.success) {
          showAdminToast(editId ? 'Tarif mis à jour.' : 'Tarif créé avec succès.', 'success');
          modal.classList.remove('open');
          loadTarifs();
        } else {
          showAdminToast(res.error?.message || 'Erreur enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  loadTarifs();
}

// ── LISTE D'ATTENTE ──
async function initWaitingList() {
  const tbody = document.getElementById('waitlist-tbody');

  async function loadWaitlist() {
    try {
      const res = await adminFetch('/admin/waiting-list');
      if (res.success && res.data && tbody) {
        if (res.data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-muted">Aucun élève en liste d'attente actuellement.</td></tr>`;
          return;
        }
        tbody.innerHTML = res.data.map((d, idx) => `
          <tr>
            <td class="font-bold text-center" style="color:var(--info);">#${idx + 1}</td>
            <td class="font-mono font-bold text-primary">${d.code}</td>
            <td class="font-semibold">${d.student?.fullName || 'Élève'}</td>
            <td>${d.primaryParent?.fullName || 'Parent'} • ${d.primaryParent?.phonePrimary || '—'}</td>
            <td>${d.school?.name || 'Campus'} • ${d.level?.name || 'Niveau'}</td>
            <td>${formatDate(d.submittedAt || d.createdAt)}</td>
            <td style="text-align: right;">
              <button class="btn btn-success btn-xs" onclick="promoteDossier('${d.id}')">
                <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Promouvoir
              </button>
              <a href="/inscriptions/${d.id}" class="btn-icon btn-icon-sm ml-1" title="Voir le dossier">
                <span class="material-symbols-outlined">visibility</span>
              </a>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {}
  }

  window.promoteDossier = async (id) => {
    try {
      const res = await adminFetch(`/admin/registrations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      if (res.success) {
        showAdminToast('Élève promu avec succès.', 'success');
        loadWaitlist();
      }
    } catch (err) {}
  };

  loadWaitlist();
}

// ── DOCUMENTS VIEW ──
async function initDocuments() {
  const reqTbody = document.getElementById('requirements-tbody');
  const docsTbody = document.getElementById('documents-tbody');
  const btnAddReq = document.getElementById('btn-add-doc-requirement');
  const modalReq = document.getElementById('modal-requirement');
  const modalTitle = document.getElementById('modal-req-title');
  const btnCloseReq = document.getElementById('btn-close-req-modal');
  const btnCancelReq = document.getElementById('btn-cancel-req');
  const formReq = document.getElementById('form-requirement');
  const reqTypeSelect = document.getElementById('req-type-id');
  const reqSchoolSelect = document.getElementById('req-school-id');
  const reqYearSelect = document.getElementById('req-academic-year-id');
  const reqLevelSelect = document.getElementById('req-level-id');
  const filterSchool = document.getElementById('filter-req-school');

  if (btnAddReq && modalReq) {
    btnAddReq.onclick = () => {
      formReq.reset();
      delete formReq.dataset.editId;
      if (modalTitle) modalTitle.textContent = 'Nouvelle exigence documentaire';
      modalReq.classList.add('open');
    };
  }
  if (btnCloseReq && modalReq) btnCloseReq.onclick = () => modalReq.classList.remove('open');
  if (btnCancelReq && modalReq) btnCancelReq.onclick = () => modalReq.classList.remove('open');

  try {
    const [schoolsRes, levelsRes, typesRes, yearsRes] = await Promise.all([
      adminFetch('/admin/schools'),
      adminFetch('/admin/levels'),
      adminFetch('/admin/documents/types'),
      adminFetch('/admin/academic-years')
    ]);

    if (schoolsRes.success && schoolsRes.data) {
      const opts = '<option value="">Sélectionnez un établissement…</option>' +
        schoolsRes.data.filter(s => s.isActive).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      if (reqSchoolSelect) reqSchoolSelect.innerHTML = opts;
      if (filterSchool) filterSchool.innerHTML = '<option value="">Tous les établissements</option>' +
        schoolsRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    if (yearsRes.success && yearsRes.data && reqYearSelect) {
      reqYearSelect.innerHTML = '<option value="">Sélectionner une année scolaire…</option>' +
        yearsRes.data.map(y => `<option value="${y.id}" ${y.status === 'ACTIVE' ? 'selected' : ''}>${y.name}</option>`).join('');
    }

    if (levelsRes.success && levelsRes.data && reqLevelSelect) {
      reqLevelSelect.innerHTML = '<option value="">Tous les niveaux de l\'établissement</option>' +
        levelsRes.data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    }

    if (typesRes.success && typesRes.data && reqTypeSelect) {
      reqTypeSelect.innerHTML = '<option value="">Sélectionnez un type de document…</option>' +
        typesRes.data.map(t => `<option value="${t.id}">${t.nameFr || t.name} (${t.code})</option>`).join('');
    }
  } catch (err) {}

  async function loadRequirements(selectedSchool = '') {
    if (!reqTbody) return;
    try {
      const url = selectedSchool
        ? `/admin/documents/requirements?schoolId=${selectedSchool}`
        : '/admin/documents/requirements';
      const res = await adminFetch(url);

      if (res.success && res.data) {
        window.__currentRequirements = res.data;
        if (res.data.length === 0) {
          reqTbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-muted">Aucune exigence configurée. Les pièces standards sont requises par défaut.</td></tr>`;
          return;
        }

        reqTbody.innerHTML = res.data.map(r => `
          <tr>
            <td class="font-semibold text-primary">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color:var(--indigo);font-size:20px;">description</span>
                <div>
                  <div>${r.docTypeNameFr || r.typeName || 'Document'}</div>
                  <div class="text-xs text-muted font-mono">${r.docTypeNameAr || ''}</div>
                </div>
              </div>
            </td>
            <td>${r.schoolName || 'Tous les campus'}</td>
            <td>${r.levelName || 'Tous les niveaux'}</td>
            <td>
              <label class="toggle-switch" title="Obligatoire">
                <input type="checkbox" ${r.isRequired ? 'checked' : ''} onchange="toggleReqRequired('${r.id}', this.checked)"/>
                <span class="toggle-slider"></span>
                <span class="text-xs">${r.isRequired ? 'Oui' : 'Non'}</span>
              </label>
            </td>
            <td>
              <label class="toggle-switch" title="Afficher côté client">
                <input type="checkbox" ${r.showClient !== false ? 'checked' : ''} onchange="toggleReqShowClient('${r.id}', this.checked)"/>
                <span class="toggle-slider"></span>
                <span class="text-xs">${r.showClient !== false ? 'Visible' : 'Masqué'}</span>
              </label>
            </td>
            <td>
              <label class="toggle-switch" title="Actif">
                <input type="checkbox" ${r.isActive !== false ? 'checked' : ''} onchange="toggleReqActive('${r.id}', this.checked)"/>
                <span class="toggle-slider"></span>
                <span class="text-xs">${r.isActive !== false ? 'Actif' : 'Inactif'}</span>
              </label>
            </td>
            <td><span class="badge badge-sm font-mono">${r.displayOrder ?? 0}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-outline btn-xs" onclick="editRequirement('${r.id}')" title="Modifier">
                <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
              </button>
              <button class="btn btn-outline btn-xs text-error ml-1" onclick="deleteRequirement('${r.id}')" title="Supprimer">
                <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      reqTbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-error">Erreur lors du chargement des exigences.</td></tr>`;
    }
  }

  if (filterSchool) {
    filterSchool.addEventListener('change', () => loadRequirements(filterSchool.value));
  }

  window.toggleReqRequired = async (id, isRequired) => {
    const item = window.__currentRequirements?.find(x => x.id === id);
    if (isRequired && item && item.showClient === false) {
      showAdminToast('Un document masqué côté client ne peut pas être obligatoire.', 'error');
      loadRequirements(filterSchool?.value || '');
      return;
    }
    try {
      const res = await adminFetch(`/admin/documents/requirements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isRequired })
      });
      if (res.success) {
        showAdminToast('Caractère obligatoire mis à jour.', 'info');
        loadRequirements(filterSchool?.value || '');
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        loadRequirements(filterSchool?.value || '');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.toggleReqShowClient = async (id, showClient) => {
    const item = window.__currentRequirements?.find(x => x.id === id);
    if (!showClient && item && item.isRequired) {
      showAdminToast('Un document masqué côté client ne peut pas être obligatoire.', 'error');
      loadRequirements(filterSchool?.value || '');
      return;
    }
    try {
      const res = await adminFetch(`/admin/documents/requirements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ showClient })
      });
      if (res.success) {
        showAdminToast('Visibilité client mise à jour.', 'info');
        loadRequirements(filterSchool?.value || '');
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        loadRequirements(filterSchool?.value || '');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.toggleReqActive = async (id, isActive) => {
    try {
      const res = await adminFetch(`/admin/documents/requirements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive })
      });
      if (res.success) {
        showAdminToast('Statut d\'activation mis à jour.', 'info');
        loadRequirements(filterSchool?.value || '');
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        loadRequirements(filterSchool?.value || '');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.deleteRequirement = async (id) => {
    if (!confirm('Voulez-vous supprimer cette règle de pièce justificative ?')) return;
    try {
      const res = await adminFetch(`/admin/documents/requirements/${id}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast('Exigence documentaire supprimée.', 'info');
        loadRequirements(filterSchool?.value || '');
      } else {
        showAdminToast(res.error?.message || 'Erreur suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.editRequirement = async (id) => {
    try {
      const res = await adminFetch('/admin/documents/requirements');
      if (res.success && res.data) {
        const item = res.data.find(r => r.id === id);
        if (item) {
          if (reqTypeSelect) reqTypeSelect.value = item.documentTypeId || '';
          if (reqSchoolSelect) reqSchoolSelect.value = item.schoolId || '';
          if (reqYearSelect && item.academicYearId) reqYearSelect.value = item.academicYearId;
          if (reqLevelSelect) reqLevelSelect.value = item.levelId || '';
          document.getElementById('req-max-size').value = Math.round((item.maxFileSizeBytes || item.maxSizeBytes || 5242880) / (1024 * 1024));
          document.getElementById('req-extensions').value = (item.allowedExtensions || ['pdf', 'jpg', 'png']).join(', ');
          const isReqEl = document.getElementById('req-is-required');
          if (isReqEl) isReqEl.checked = item.isRequired;
          const showClEl = document.getElementById('req-show-client');
          if (showClEl) showClEl.checked = item.showClient !== false;
          const isActEl = document.getElementById('req-is-active');
          if (isActEl) isActEl.checked = item.isActive !== false;
          const dispOrderEl = document.getElementById('req-display-order');
          if (dispOrderEl) dispOrderEl.value = item.displayOrder ?? 0;

          formReq.dataset.editId = id;
          if (modalTitle) modalTitle.textContent = 'Modifier l\'exigence documentaire';
          modalReq.classList.add('open');
        }
      }
    } catch (err) {}
  };

  if (formReq) {
    formReq.addEventListener('submit', async (e) => {
      e.preventDefault();
      const extStr = document.getElementById('req-extensions')?.value || 'pdf,jpg,png';
      const exts = extStr.split(',').map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
      const maxMb = parseInt(document.getElementById('req-max-size')?.value, 10) || 5;

      const isRequired = document.getElementById('req-is-required')?.checked ?? true;
      const showClient = document.getElementById('req-show-client')?.checked ?? true;
      const isActive = document.getElementById('req-is-active')?.checked ?? true;
      const displayOrder = parseInt(document.getElementById('req-display-order')?.value, 10) || 0;

      if (!showClient && isRequired) {
        showAdminToast('Un document masqué côté client ne peut pas être obligatoire.', 'error');
        return;
      }

      const payload = {
        documentTypeId: reqTypeSelect?.value,
        schoolId: reqSchoolSelect?.value,
        academicYearId: reqYearSelect?.value,
        levelId: reqLevelSelect?.value || null,
        isRequired,
        showClient,
        isActive,
        displayOrder,
        allowedExtensions: exts,
        maxSizeBytes: maxMb * 1024 * 1024
      };

      if (!payload.documentTypeId) {
        showAdminToast('Veuillez sélectionner un type de document.', 'error');
        return;
      }
      if (!payload.schoolId) {
        showAdminToast('Veuillez sélectionner un établissement.', 'error');
        return;
      }
      if (!payload.academicYearId) {
        showAdminToast('Veuillez sélectionner une année scolaire.', 'error');
        return;
      }

      const editId = formReq.dataset.editId;
      const url = editId ? `/admin/documents/requirements/${editId}` : '/admin/documents/requirements';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
        if (res.success) {
          showAdminToast(editId ? 'Exigence mise à jour.' : 'Exigence créée avec succès.', 'success');
          modalReq.classList.remove('open');
          loadRequirements(filterSchool?.value || '');
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  async function loadReceivedDocuments() {
    if (!docsTbody) return;
    try {
      const res = await adminFetch('/admin/documents');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          docsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-muted">Aucune pièce transmise pour le moment.</td></tr>`;
          return;
        }
        docsTbody.innerHTML = res.data.map(doc => `
          <tr>
            <td class="font-medium flex items-center gap-2">
              <span class="material-symbols-outlined" style="color:var(--text-muted);">description</span>
              <span>${doc.originalName || doc.name}</span>
            </td>
            <td class="font-mono text-xs font-semibold">${doc.registrationCode || '—'}</td>
            <td><span class="badge badge-sm badge-role-admin">${doc.type}</span></td>
            <td class="text-xs text-muted">${doc.mimeType || 'PDF'}</td>
            <td><span class="badge badge-accepted">Vérifié</span></td>
            <td>${formatDate(doc.createdAt)}</td>
            <td style="text-align: right;">
              <a href="${doc.url || '#'}" target="_blank" class="btn btn-outline btn-xs">
                <span class="material-symbols-outlined" style="font-size:14px;">download</span> Télécharger
              </a>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {}
  }

  loadRequirements();
  loadReceivedDocuments();
}

// ── FORM BUILDER VIEW ──
async function initFormBuilder() {
  const container = document.getElementById('form-builder-sections');
  const btnPublish = document.getElementById('btn-publish-form');
  const versionLabel = document.getElementById('fb-version-label');
  const modalEdit = document.getElementById('modal-edit-field');
  const btnCloseModal = document.getElementById('btn-close-field-modal');
  const btnCancelModal = document.getElementById('btn-cancel-field');
  const formEdit = document.getElementById('form-edit-field');

  if (btnCloseModal && modalEdit) btnCloseModal.onclick = () => modalEdit.classList.remove('open');
  if (btnCancelModal && modalEdit) btnCancelModal.onclick = () => modalEdit.classList.remove('open');

  let currentFormDef = null;

  async function loadForm() {
    if (!container) return;
    container.innerHTML = `<div class="card py-10 text-center text-muted">Chargement du formulaire…</div>`;

    try {
      const res = await adminFetch('/admin/forms/default');
      if (res.success && res.data) {
        currentFormDef = res.data;
        if (versionLabel) versionLabel.textContent = `Version v${currentFormDef.version} - ${currentFormDef.status === 'PUBLISHED' ? 'Publiée' : 'Brouillon'}`;
        renderSections(currentFormDef.sections || []);
      } else {
        container.innerHTML = `<div class="card py-10 text-center text-error">Impossible de charger le formulaire d'inscription.</div>`;
      }
    } catch (err) {
      container.innerHTML = `<div class="card py-10 text-center text-error">Erreur de communication avec le serveur.</div>`;
    }
  }

  function renderSections(sections) {
    if (!container) return;
    if (sections.length === 0) {
      container.innerHTML = `<div class="card py-10 text-center text-muted">Aucune section configurée.</div>`;
      return;
    }

    container.innerHTML = sections.map(sec => `
      <div class="fb-section">
        <div class="fb-section-header">
          <div>
            <div class="font-bold text-base text-primary">${sec.labelFr} ${sec.labelAr ? `<span class="text-xs text-muted font-normal mr-2">(${sec.labelAr})</span>` : ''}</div>
            <div class="text-xs text-muted">Rubrique: <code class="text-xs font-mono">${sec.key}</code> • Ordre d'affichage: ${sec.displayOrder}</div>
          </div>
          <span class="badge ${sec.isVisible ? 'badge-accepted' : 'badge-inactive'}">${sec.isVisible ? 'Rubrique Active' : 'Masquée'}</span>
        </div>
        <div class="fb-fields-list">
          ${(sec.fields || []).map(f => `
            <div class="fb-field-row" id="fb-row-${f.id}">
              <div class="fb-field-info">
                <div class="fb-field-label">
                  <span>${f.labelFr}</span>
                  ${f.isSystemProtected ? '<span class="badge badge-sm badge-role-admin" title="Champ indispensable au dossier">Système</span>' : ''}
                </div>
                <div class="fb-field-meta">
                  <span>Clé: <code>${f.fieldKey}</code></span>
                  <span>Type: <strong>${f.fieldType}</strong></span>
                  ${f.placeholderFr ? `<span>Placeholder: "<em>${f.placeholderFr}</em>"</span>` : ''}
                </div>
              </div>
              <div class="fb-field-controls">
                <label class="toggle-switch" title="Obligatoire">
                  <input type="checkbox" ${f.isRequired ? 'checked' : ''} ${f.isSystemProtected ? 'disabled' : ''} onchange="toggleFieldRequired('${f.id}', this.checked)"/>
                  <span class="toggle-slider"></span>
                  <span>Obligatoire</span>
                </label>

                <label class="toggle-switch" title="Afficher côté client">
                  <input type="checkbox" ${f.isVisible ? 'checked' : ''} ${f.isSystemProtected ? 'disabled' : ''} onchange="toggleFieldVisible('${f.id}', this.checked)"/>
                  <span class="toggle-slider"></span>
                  <span>Afficher côté client</span>
                </label>

                <button class="btn btn-outline btn-xs" onclick="openEditFieldModal('${f.id}')" title="Modifier le libellé">
                  <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  window.toggleFieldRequired = async (fieldId, isRequired) => {
    let currentField = null;
    for (const s of currentFormDef?.sections || []) {
      const found = (s.fields || []).find(f => f.id === fieldId);
      if (found) { currentField = found; break; }
    }
    if (isRequired && currentField && !currentField.isVisible) {
      showAdminToast('Un champ masqué côté client ne peut pas être obligatoire.', 'error');
      loadForm();
      return;
    }

    try {
      const res = await adminFetch(`/admin/forms/fields/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify({ isRequired })
      });
      if (res.success) {
        showAdminToast('Règle d\'obligation mise à jour.', 'info');
        if (currentField) currentField.isRequired = isRequired;
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        loadForm();
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.toggleFieldVisible = async (fieldId, isVisible) => {
    let currentField = null;
    for (const s of currentFormDef?.sections || []) {
      const found = (s.fields || []).find(f => f.id === fieldId);
      if (found) { currentField = found; break; }
    }
    if (!isVisible && currentField && currentField.isRequired) {
      showAdminToast('Un champ masqué côté client ne peut pas être obligatoire.', 'error');
      loadForm();
      return;
    }

    try {
      const res = await adminFetch(`/admin/forms/fields/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify({ isVisible })
      });
      if (res.success) {
        showAdminToast('Affichage côté client mis à jour.', 'info');
        if (currentField) currentField.isVisible = isVisible;
      } else {
        showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        loadForm();
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.openEditFieldModal = (fieldId) => {
    if (!currentFormDef) return;
    let targetField = null;
    for (const s of currentFormDef.sections || []) {
      const found = (s.fields || []).find(f => f.id === fieldId);
      if (found) { targetField = found; break; }
    }
    if (!targetField) return;

    document.getElementById('edit-field-id').value = targetField.id;
    document.getElementById('edit-field-label-fr').value = targetField.labelFr || '';
    document.getElementById('edit-field-label-ar').value = targetField.labelAr || '';
    document.getElementById('edit-field-placeholder').value = targetField.placeholderFr || '';
    document.getElementById('edit-field-help').value = targetField.helpTextFr || '';
    document.getElementById('edit-field-required').checked = targetField.isRequired;
    document.getElementById('edit-field-visible').checked = targetField.isVisible;

    if (modalEdit) modalEdit.classList.add('open');
  };

  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fieldId = document.getElementById('edit-field-id').value;
      const isRequired = document.getElementById('edit-field-required').checked;
      const isVisible = document.getElementById('edit-field-visible').checked;

      if (!isVisible && isRequired) {
        showAdminToast('Un champ masqué côté client ne peut pas être obligatoire.', 'error');
        return;
      }

      const payload = {
        labelFr: document.getElementById('edit-field-label-fr').value.trim(),
        labelAr: document.getElementById('edit-field-label-ar').value.trim() || undefined,
        placeholderFr: document.getElementById('edit-field-placeholder').value.trim() || undefined,
        helpTextFr: document.getElementById('edit-field-help').value.trim() || undefined,
        isRequired,
        isVisible
      };

      try {
        const res = await adminFetch(`/admin/forms/fields/${fieldId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          showAdminToast('Champ modifié avec succès.', 'success');
          modalEdit.classList.remove('open');
          loadForm();
        } else {
          showAdminToast(res.error?.message || 'Erreur modification.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  if (btnPublish) {
    btnPublish.addEventListener('click', async () => {
      if (!currentFormDef) return;
      btnPublish.disabled = true;
      try {
        const res = await adminFetch(`/admin/forms/${currentFormDef.id}/publish`, { method: 'POST' });
        if (res.success) {
          showAdminToast('Formulaire publié ! Les modifications sont actives sur le site web.', 'success');
          loadForm();
        } else {
          showAdminToast(res.error?.message || 'Erreur publication.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      } finally {
        btnPublish.disabled = false;
      }
    });
  }

  loadForm();
}

// ── MEDIAS VIEW ──
async function initMedias() {
  const grid = document.getElementById('media-grid');
  const btnUpload = document.getElementById('btn-upload-media');
  const modalUpload = document.getElementById('modal-media-upload');
  const btnCloseModal = document.getElementById('btn-close-media-modal');
  const btnCancelModal = document.getElementById('btn-cancel-media');
  const formUpload = document.getElementById('form-media-upload');
  const fileInput = document.getElementById('media-file-input');

  if (btnUpload && modalUpload) btnUpload.onclick = () => modalUpload.classList.add('open');
  if (btnCloseModal && modalUpload) btnCloseModal.onclick = () => modalUpload.classList.remove('open');
  if (btnCancelModal && modalUpload) btnCancelModal.onclick = () => modalUpload.classList.remove('open');

  let currentCategory = 'ALL';
  let allMedia = [];

  async function loadMedia() {
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-4 text-center py-12 text-muted">Chargement des médias…</div>`;
    try {
      const res = await adminFetch('/admin/media');
      if (res.success && res.data) {
        allMedia = res.data;
        renderGrid();
      } else {
        grid.innerHTML = `<div class="col-span-4 text-center py-12 text-error">Impossible de charger la médiathèque.</div>`;
      }
    } catch (err) {
      grid.innerHTML = `<div class="col-span-4 text-center py-12 text-error">Erreur de communication.</div>`;
    }
  }

  function renderGrid() {
    if (!grid) return;
    const filtered = currentCategory === 'ALL'
      ? allMedia
      : allMedia.filter(m => (m.galleryCategory || '').toUpperCase() === currentCategory);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-4 text-center py-12 text-muted">Aucune image trouvée dans cette catégorie.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(m => {
      const src = m.sources?.desktop || m.sources?.fallback || m.url || '';
      const isArchived = m.status === 'ARCHIVED';
      const statusBadge = isArchived
        ? '<span class="badge badge-sm badge-inactive">Archivé</span>'
        : m.status === 'PUBLISHED'
        ? '<span class="badge badge-sm badge-accepted">Publié</span>'
        : '<span class="badge badge-sm badge-new">Brouillon</span>';

      return `
        <div class="media-card" id="media-card-${m.id}">
          <img src="${src}" alt="${m.title || 'Média'}" loading="lazy" onclick="previewImage('${src}')"/>
          <div class="media-card-body">
            <div class="flex items-center justify-between mb-1">
              <div class="text-sm font-semibold truncate" title="${m.title || ''}">${m.title || 'Sans titre'}</div>
              ${statusBadge}
            </div>
            <div class="flex items-center justify-between text-xs text-muted mb-2">
              <span>${m.galleryCategory || m.type || 'Général'}</span>
              <span>${m.aspectRatio || ''}</span>
            </div>
            <div class="flex items-center justify-end gap-1 pt-2 border-t" style="border-top:1px solid var(--border);">
              <button class="btn btn-outline btn-xs" onclick="previewImage('${src}')" title="Agrandir">
                <span class="material-symbols-outlined text-xs">visibility</span>
              </button>
              ${isArchived ? `
                <button class="btn btn-secondary btn-xs" onclick="restoreAdminMedia('${m.id}')" title="Restaurer">
                  <span class="material-symbols-outlined text-xs">unarchive</span>
                </button>
              ` : `
                <button class="btn btn-secondary btn-xs" onclick="archiveAdminMedia('${m.id}')" title="Archiver">
                  <span class="material-symbols-outlined text-xs">archive</span>
                </button>
              `}
              <button class="btn btn-danger-outline btn-xs" onclick="deleteAdminMedia('${m.id}')" title="Supprimer définitivement">
                <span class="material-symbols-outlined text-xs">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.archiveAdminMedia = async (mediaId) => {
    try {
      const res = await adminFetch(`/admin/media/${mediaId}/archive`, { method: 'POST' });
      if (res.success) {
        showAdminToast('Média archivé avec succès.', 'info');
        loadMedia();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de l\'archivage.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.restoreAdminMedia = async (mediaId) => {
    try {
      const res = await adminFetch(`/admin/media/${mediaId}/restore`, { method: 'POST' });
      if (res.success) {
        showAdminToast('Média restauré avec succès.', 'success');
        loadMedia();
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la restauration.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur.', 'error');
    }
  };

  window.deleteAdminMedia = async (mediaId) => {
    if (!confirm('Supprimer définitivement cette image ?')) return;
    try {
      const res = await adminFetch(`/admin/media/${mediaId}`, { method: 'DELETE' });
      if (res.success) {
        showAdminToast('Média supprimé définitivement.', 'success');
        loadMedia();
      } else {
        alert(res.error?.message || 'Impossible de supprimer cette image : elle est actuellement utilisée.');
      }
    } catch (err) {
      showAdminToast('Erreur lors de la suppression.', 'error');
    }
  };

  window.filterMedia = (category) => {
    currentCategory = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    renderGrid();
  };

  // Upload handler
  if (formUpload) {
    formUpload.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('media-title')?.value.trim();
      const category = document.getElementById('media-category')?.value;
      const file = fileInput?.files?.[0];

      if (!file) {
        showAdminToast('Veuillez sélectionner un fichier image.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const res = await adminFetch('/admin/media', {
            method: 'POST',
            body: JSON.stringify({
              title,
              galleryCategory: category,
              type: 'GALLERY',
              initialStatus: 'PUBLISHED',
              originalFile: {
                filename: file.name,
                mimeType: file.type,
                bufferBase64: base64
              }
            })
          });

          if (res.success) {
            showAdminToast('Image téléversée avec succès.', 'success');
            modalUpload.classList.remove('open');
            formUpload.reset();
            loadMedia();
          } else {
            showAdminToast(res.error?.message || 'Erreur téléversement.', 'error');
          }
        } catch (err) {
          showAdminToast('Erreur serveur.', 'error');
        }
      };
      reader.readAsDataURL(file);
    };
  }

  loadMedia();
}

// ── UTILISATEURS VIEW ──
async function initUtilisateurs() {
  const tbody = document.getElementById('users-tbody');
  const btnAdd = document.getElementById('btn-add-user');
  const modal = document.getElementById('modal-user');
  const btnClose = document.getElementById('btn-close-user-modal');
  const btnCancel = document.getElementById('btn-cancel-user');
  const form = document.getElementById('form-user');

  if (btnAdd && modal) btnAdd.onclick = () => { form.reset(); modal.classList.add('open'); };
  if (btnClose && modal) btnClose.onclick = () => modal.classList.remove('open');
  if (btnCancel && modal) btnCancel.onclick = () => modal.classList.remove('open');

  async function loadUsers() {
    try {
      const res = await adminFetch('/admin/users');
      if (res.success && res.data && tbody) {
        tbody.innerHTML = res.data.map(u => `
          <tr>
            <td class="font-semibold text-primary">${u.firstName} ${u.lastName}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-sm ${u.role === 'SUPER_ADMIN' ? 'badge-role-super' : 'badge-role-admin'}">${u.role}</span></td>
            <td>${u.school?.name || 'Tous les campus'}</td>
            <td><span class="badge ${u.isActive !== false ? 'badge-accepted' : 'badge-inactive'}">${u.isActive !== false ? 'Actif' : 'Inactif'}</span></td>
            <td>${formatDate(u.lastLoginAt || u.createdAt)}</td>
            <td style="text-align: right;">
              <button class="btn btn-ghost btn-xs">Modifier</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {}
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        firstName: document.getElementById('user-first-name')?.value.trim(),
        lastName: document.getElementById('user-last-name')?.value.trim(),
        email: document.getElementById('user-email')?.value.trim(),
        password: document.getElementById('user-password')?.value,
        role: document.getElementById('user-role')?.value || 'ADMIN'
      };

      try {
        const res = await adminFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
          showAdminToast('Utilisateur créé avec succès.', 'success');
          modal.classList.remove('open');
          loadUsers();
        } else {
          showAdminToast(res.error?.message || 'Erreur création.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  loadUsers();
}

// ── NOTIFICATIONS VIEW ──
async function initNotifications() {
  const listContainer = document.getElementById('notifications-list');
  const btnMark = document.getElementById('btn-mark-all-read');

  try {
    const res = await adminFetch('/admin/notifications');
    if (res.success && res.data && listContainer && res.data.length > 0) {
      listContainer.innerHTML = res.data.map(n => `
        <div class="p-4 flex items-start gap-3 hover:bg-surface-alt transition-colors" style="border-bottom: 1px solid var(--border);">
          <span class="material-symbols-outlined" style="color:var(--indigo); margin-top:2px;">notifications</span>
          <div class="flex-1">
            <div class="text-sm font-semibold">${n.title || 'Notification'}</div>
            <div class="text-xs text-muted mt-1">${n.message || ''}</div>
            <div class="text-xs text-subtle mt-1">${formatDate(n.createdAt)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {}

  if (btnMark) {
    btnMark.onclick = () => {
      showAdminToast('Toutes les notifications sont marquées comme lues.', 'info');
      const dot = document.getElementById('topbar-notif-dot');
      if (dot) dot.classList.add('hidden');
    };
  }
}

// ── RAPPORTS VIEW ──
async function initRapports() {
  const schoolCanvas = document.getElementById('chart-reports-schools');
  if (schoolCanvas && typeof Chart !== 'undefined') {
    new Chart(schoolCanvas, {
      type: 'bar',
      data: {
        labels: ['Hydra Principal', 'Alger Centre', 'Oran Campus'],
        datasets: [{
          label: 'Dossiers reçus',
          data: [420, 290, 160],
          backgroundColor: ['#0f1e3d', '#2563eb', '#3b82f6'],
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const cycleCanvas = document.getElementById('chart-reports-cycles');
  if (cycleCanvas && typeof Chart !== 'undefined') {
    new Chart(cycleCanvas, {
      type: 'pie',
      data: {
        labels: ['Préscolaire', 'Primaire', 'Moyen', 'Secondaire'],
        datasets: [{
          data: [25, 45, 20, 10],
          backgroundColor: ['#d4a017', '#059669', '#2563eb', '#7c3aed']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// ── PARAMETRES & PROFIL VIEW ──
function updateAdminLogoPreviews(b) {
  if (!b) return;
  // Client Logo
  const prevClient = document.getElementById('preview-client-logo');
  const phClient = document.getElementById('placeholder-client-logo');
  const btnRemClient = document.getElementById('btn-remove-client-logo');
  if (prevClient && phClient && btnRemClient) {
    if (b.clientLogoUrl) {
      prevClient.src = resolveMediaUrl(b.clientLogoUrl);
      prevClient.classList.remove('hidden');
      phClient.classList.add('hidden');
      btnRemClient.classList.remove('hidden');
    } else {
      prevClient.src = '';
      prevClient.classList.add('hidden');
      phClient.classList.remove('hidden');
      btnRemClient.classList.add('hidden');
    }
  }

  // Admin Logo
  const prevAdmin = document.getElementById('preview-admin-logo');
  const phAdmin = document.getElementById('placeholder-admin-logo');
  const btnRemAdmin = document.getElementById('btn-remove-admin-logo');
  if (prevAdmin && phAdmin && btnRemAdmin) {
    if (b.adminLogoUrl) {
      prevAdmin.src = resolveMediaUrl(b.adminLogoUrl);
      prevAdmin.classList.remove('hidden');
      phAdmin.classList.add('hidden');
      btnRemAdmin.classList.remove('hidden');
    } else {
      prevAdmin.src = '';
      prevAdmin.classList.add('hidden');
      phAdmin.classList.remove('hidden');
      btnRemAdmin.classList.add('hidden');
    }
  }

  // Favicon
  const prevFav = document.getElementById('preview-favicon');
  const phFav = document.getElementById('placeholder-favicon');
  const btnRemFav = document.getElementById('btn-remove-favicon');
  if (prevFav && phFav && btnRemFav) {
    if (b.faviconUrl) {
      prevFav.src = resolveMediaUrl(b.faviconUrl);
      prevFav.classList.remove('hidden');
      phFav.classList.add('hidden');
      btnRemFav.classList.remove('hidden');
    } else {
      prevFav.src = '';
      prevFav.classList.add('hidden');
      phFav.classList.remove('hidden');
      btnRemFav.classList.add('hidden');
    }
  }
}

async function initParametres(initialTab = null) {
  const hash = window.location.hash.replace('#', '');
  const activeTab = initialTab || hash;
  if (activeTab && typeof showSettingsTab === 'function') {
    showSettingsTab(activeTab);
  }

  // 1. General Settings & Branding Form Prepopulation
  const formGen = document.getElementById('form-settings-general');
  const nameInput = document.getElementById('setting-school-name');
  const shortInput = document.getElementById('setting-short-name');
  const subInput = document.getElementById('setting-school-sub');
  const emailInput = document.getElementById('setting-email');
  const phoneInput = document.getElementById('setting-phone');
  const addrInput = document.getElementById('setting-address');
  const wilayaInput = document.getElementById('setting-wilaya');
  const communeInput = document.getElementById('setting-commune');
  const latInput = document.getElementById('setting-latitude');
  const lngInput = document.getElementById('setting-longitude');
  const gmapsInput = document.getElementById('setting-google-maps-url');

  try {
    const res = await adminFetch('/admin/settings/branding');
    if (res.success && res.data) {
      const b = res.data;
      if (nameInput) nameInput.value = b.platformName || b.siteName || '';
      if (shortInput) shortInput.value = b.shortName || b.brandShortName || '';
      if (subInput) subInput.value = b.tagline || '';
      if (emailInput) emailInput.value = b.contactEmail || '';
      if (phoneInput) phoneInput.value = b.contactPhone || '';
      if (addrInput) addrInput.value = b.contactAddress || '';
      if (wilayaInput) wilayaInput.value = b.wilaya || '';
      if (communeInput) communeInput.value = b.commune || '';
      if (latInput) latInput.value = b.latitude !== null && b.latitude !== undefined ? b.latitude : '';
      if (lngInput) lngInput.value = b.longitude !== null && b.longitude !== undefined ? b.longitude : '';
      if (gmapsInput) gmapsInput.value = b.googleMapsUrl || '';
      updateAdminLogoPreviews(b);
    }
  } catch (err) {
    console.error('[Parametres] Erreur chargement paramètres:', err);
  }

  if (formGen) {
    formGen.addEventListener('submit', async (e) => {
      e.preventDefault();
      const platformName = nameInput?.value?.trim();
      if (!platformName) {
        showAdminToast("Le nom complet de l'établissement est requis.", 'error');
        return;
      }

      const latVal = latInput?.value?.trim();
      const lngVal = lngInput?.value?.trim();
      let latitude = null;
      let longitude = null;
      if (latVal) {
        latitude = Number(latVal);
        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
          showAdminToast('La latitude doit être comprise entre -90 et 90.', 'error');
          return;
        }
      }
      if (lngVal) {
        longitude = Number(lngVal);
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
          showAdminToast('La longitude doit être comprise entre -180 et 180.', 'error');
          return;
        }
      }

      const gmapsVal = gmapsInput?.value?.trim() || '';
      if (gmapsVal && !gmapsVal.startsWith('http://') && !gmapsVal.startsWith('https://')) {
        showAdminToast("L'URL Google Maps doit commencer par http:// ou https://", 'error');
        return;
      }

      const payload = {
        platformName,
        siteName: platformName,
        shortName: shortInput?.value?.trim() || '',
        brandShortName: shortInput?.value?.trim() || '',
        tagline: subInput?.value?.trim() || '',
        contactEmail: emailInput?.value?.trim() || '',
        contactPhone: phoneInput?.value?.trim() || '',
        contactAddress: addrInput?.value?.trim() || '',
        wilaya: wilayaInput?.value?.trim() || '',
        commune: communeInput?.value?.trim() || '',
        latitude,
        longitude,
        googleMapsUrl: gmapsVal
      };

      const submitBtn = formGen.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }

      try {
        const res = await adminFetch('/admin/settings/branding', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success && res.data) {
          showAdminToast('Identité institutionnelle enregistrée avec succès.', 'success');
          applyAdminBranding(res.data);
          localStorage.setItem('vs_branding_sync', JSON.stringify({ ...res.data, _ts: Date.now() }));
        } else {
          showAdminToast(res.error?.message || 'Erreur lors de la sauvegarde.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur lors de la sauvegarde.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }
    });
  }

  // 2. Logo Upload Inputs Handlers
  function wireLogoUpload(inputId, target) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('Le fichier ne doit pas dépasser 5 Mo.', 'error');
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        try {
          const res = await adminFetch('/admin/settings/logos', {
            method: 'POST',
            body: JSON.stringify({
              target,
              fileBufferBase64: base64Data,
              mimeType: file.type || 'image/png',
              originalFilename: file.name
            })
          });
          if (res.success) {
            showAdminToast('Élément graphique mis à jour avec succès.', 'success');
            const bRes = await adminFetch('/admin/settings/branding');
            if (bRes.success && bRes.data) {
              applyAdminBranding(bRes.data);
              updateAdminLogoPreviews(bRes.data);
              localStorage.setItem('vs_branding_sync', JSON.stringify({ ...bRes.data, _ts: Date.now() }));
            }
          } else {
            showAdminToast(res.error?.message || 'Erreur lors du téléchargement.', 'error');
          }
        } catch (err) {
          showAdminToast('Erreur serveur lors du téléchargement.', 'error');
        } finally {
          input.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  wireLogoUpload('input-client-logo', 'client');
  wireLogoUpload('input-admin-logo', 'admin');
  wireLogoUpload('input-favicon', 'favicon');

  // 3. Logo Removal Handler
  window.removeLogo = async function(target) {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser cet élément graphique ?')) return;
    try {
      const res = await adminFetch(`/admin/settings/logos/${target}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showAdminToast('Élément graphique réinitialisé avec succès.', 'success');
        const bRes = await adminFetch('/admin/settings/branding');
        if (bRes.success && bRes.data) {
          applyAdminBranding(bRes.data);
          updateAdminLogoPreviews(bRes.data);
          localStorage.setItem('vs_branding_sync', JSON.stringify({ ...bRes.data, _ts: Date.now() }));
        }
      } else {
        showAdminToast(res.error?.message || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      showAdminToast('Erreur serveur lors de la suppression.', 'error');
    }
  };

  // 2. Profile Self-Service Management
  const profileForm = document.getElementById('form-settings-profile');
  const pwForm = document.getElementById('form-change-password');
  const inputFirst = document.getElementById('profile-first-name');
  const inputLast = document.getElementById('profile-last-name');
  const inputPhone = document.getElementById('profile-phone');
  const inputEmail = document.getElementById('profile-email');

  try {
    const res = await adminFetch('/admin/profile');
    if (res.success && res.data) {
      const u = res.data;
      if (inputFirst) inputFirst.value = u.firstName || '';
      if (inputLast) inputLast.value = u.lastName || '';
      if (inputPhone) inputPhone.value = u.phone || '';
      if (inputEmail) inputEmail.value = u.email || '';
      updateUserDisplay(u);
    }
  } catch (err) {}

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = inputFirst?.value?.trim();
      const lastName = inputLast?.value?.trim();
      const phone = inputPhone?.value?.trim();

      if (!firstName || !lastName) {
        showAdminToast('Le prénom et le nom sont requis.', 'error');
        return;
      }

      try {
        const res = await adminFetch('/admin/profile', {
          method: 'PUT',
          body: JSON.stringify({ firstName, lastName, phone })
        });

        if (res.success) {
          showAdminToast('Profil mis à jour avec succès.', 'success');
          const user = AdminAuth.getUser() || {};
          user.firstName = firstName;
          user.lastName = lastName;
          user.phone = phone;
          localStorage.setItem('vs_admin_user', JSON.stringify(user));
          updateUserDisplay(user);
        } else {
          showAdminToast(res.error?.message || 'Erreur mise à jour.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }

  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pw-current')?.value;
      const newPassword = document.getElementById('pw-new')?.value;
      const confirmPassword = document.getElementById('pw-confirm')?.value;

      if (!currentPassword || !newPassword) {
        showAdminToast('Veuillez renseigner les mots de passe.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAdminToast('La confirmation ne correspond pas au nouveau mot de passe.', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showAdminToast('Le mot de passe doit comporter au moins 8 caractères.', 'error');
        return;
      }

      try {
        const res = await adminFetch('/admin/profile/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (res.success) {
          showAdminToast('Mot de passe mis à jour avec succès.', 'success');
          pwForm.reset();
        } else {
          showAdminToast(res.error?.message || 'Erreur changement mot de passe.', 'error');
        }
      } catch (err) {
        showAdminToast('Erreur serveur.', 'error');
      }
    });
  }
}

