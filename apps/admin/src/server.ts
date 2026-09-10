import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;
const API_URL = process.env.API_URL || (process.env.NODE_ENV === 'production' ? 'http://api:4000' : 'http://localhost:4000');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VIEWS_DIR = path.join(__dirname, '..', 'views');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Serve static assets
app.use('/public', express.static(PUBLIC_DIR));

/**
 * Extract admin session token from Cookie header or Authorization Bearer header.
 */
function getSessionToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Check query parameter (e.g. for direct downloads / window.open)
  if (req.query && typeof req.query.token === 'string') {
    return (req.query.token as string).trim();
  }

  // Check Cookies
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith('vs_admin_session=')) {
        const val = c.substring('vs_admin_session='.length).trim();
        if (val && val !== 'null' && val !== 'undefined') {
          return val;
        }
      }
    }
  }

  return null;
}

/**
 * Public routes that do NOT require authentication
 */
const PUBLIC_PATHS = ['/login', '/2fa', '/forgot-password', '/reset-password', '/health'];

// Proxy all /api/* requests to API_URL (port 4000)
app.use('/api', async (req: Request, res: Response) => {
  try {
    const targetUrl = `${API_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {};
    const hopByHop = ['host', 'expect', 'connection', 'keep-alive', 'transfer-encoding', 'content-length'];
    for (const [key, value] of Object.entries(req.headers)) {
      if (!hopByHop.includes(key.toLowerCase()) && typeof value === 'string') {
        headers[key] = value;
      }
    }
    if (!headers['authorization']) {
      const sessionToken = getSessionToken(req);
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
    }
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }
    const apiRes = await fetch(targetUrl, fetchOptions);
    apiRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(k, v);
      }
    });
    res.status(apiRes.status);
    const buf = Buffer.from(await apiRes.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    console.error(`[Admin API Proxy Error] ${req.originalUrl}:`, err);
    res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: 'API inaccessible' } });
  }
});

/**
 * Server-side Route Guard for Admin application
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const pathName = req.path;

  // Allow static assets
  if (pathName.startsWith('/public') || pathName === '/favicon.ico') {
    return next();
  }

  // Check if public auth route
  const isPublic = PUBLIC_PATHS.some(p => pathName === p || pathName.startsWith(`${p}/`));
  const token = getSessionToken(req);

  if (isPublic) {
    // If user already has an active session and is trying to visit /login, redirect to /dashboard (unless logout param)
    if (pathName === '/login' && token && req.query.logout !== '1') {
      return res.redirect('/dashboard');
    }
    return next();
  }

  // Protected route: require valid session token
  if (!token) {
    // Redirect anonymous users directly to /login
    return res.redirect('/login');
  }

  // Session token present -> proceed to protected routes
  next();
});

// Canonical VISION SCHOOL Sidebar HTML
const CANONICAL_SIDEBAR = `
<div id="mobile-sidebar-overlay" class="mobile-overlay"></div>
<aside id="admin-sidebar" class="sidebar select-none">
  <!-- Brand Logo -->
  <div class="sidebar-brand">
    <div class="sidebar-brand-icon" id="admin-brand-icon">
      <span class="material-symbols-outlined">school</span>
    </div>
    <div class="overflow-hidden">
      <div class="sidebar-brand-name" id="admin-brand-name" data-brand-name>ROEYA SCHOOL</div>
      <div class="sidebar-brand-sub">Administration</div>
    </div>
  </div>

  <!-- Navigation Menu List -->
  <nav class="sidebar-nav">
    <a data-nav-link="/dashboard" class="sidebar-link" href="/dashboard">
      <span class="material-symbols-outlined">dashboard</span>
      <span>Dashboard</span>
    </a>

    <!-- Inscriptions (Expandable Group) -->
    <div class="sidebar-section-label">Admissions</div>
    <div id="nav-inscriptions-toggle" class="sidebar-link">
      <span class="material-symbols-outlined">how_to_reg</span>
      <span>Inscriptions</span>
      <span id="nav-inscriptions-chevron" class="material-symbols-outlined sidebar-chevron">expand_more</span>
    </div>
    <!-- Submenu items -->
    <div id="nav-inscriptions-submenu" class="sidebar-submenu">
      <a data-nav-link="/inscriptions" class="sidebar-submenu-link" href="/inscriptions">
        <span>Toutes les demandes</span>
      </a>
      <a data-nav-link="/inscriptions?status=NEW" class="sidebar-submenu-link" href="/inscriptions?status=NEW">
        <span>Nouvelles</span>
        <span id="sidebar-new-badge" class="sidebar-badge">0</span>
      </a>
      <a data-nav-link="/inscriptions?status=PENDING" class="sidebar-submenu-link" href="/inscriptions?status=PENDING">
        <span>En attente</span>
      </a>
      <a data-nav-link="/inscriptions?status=ACCEPTED" class="sidebar-submenu-link" href="/inscriptions?status=ACCEPTED">
        <span>Acceptées</span>
      </a>
      <a data-nav-link="/inscriptions?status=REFUSED" class="sidebar-submenu-link" href="/inscriptions?status=REFUSED">
        <span>Refusées</span>
      </a>
      <a data-nav-link="/liste-attente" class="sidebar-submenu-link" href="/liste-attente">
        <span>Liste d'attente</span>
      </a>
      <a data-nav-link="/inscriptions?status=CANCELLED" class="sidebar-submenu-link" href="/inscriptions?status=CANCELLED">
        <span>Annulées</span>
      </a>
    </div>

    <!-- Structure -->
    <div class="sidebar-section-label">Structure</div>
    <a data-nav-link="/etablissements" class="sidebar-link" href="/etablissements">
      <span class="material-symbols-outlined">domain</span>
      <span>Établissements</span>
    </a>
    <a data-nav-link="/niveaux-capacites" class="sidebar-link" href="/niveaux-capacites">
      <span class="material-symbols-outlined">layers</span>
      <span>Niveaux &amp; Capacités</span>
    </a>
    <a data-nav-link="/annees-scolaires" class="sidebar-link" href="/annees-scolaires">
      <span class="material-symbols-outlined">calendar_month</span>
      <span>Années scolaires</span>
    </a>
    <a data-nav-link="/tarifs" class="sidebar-link" href="/tarifs">
      <span class="material-symbols-outlined">payments</span>
      <span>Tarifs</span>
    </a>

    <!-- Ressources -->
    <div class="sidebar-section-label">Ressources</div>
    <a data-nav-link="/documents" class="sidebar-link" href="/documents">
      <span class="material-symbols-outlined">description</span>
      <span>Documents</span>
    </a>
    <a data-nav-link="/medias" class="sidebar-link" href="/medias">
      <span class="material-symbols-outlined">perm_media</span>
      <span>Médias</span>
    </a>
    <a data-nav-link="/form-builder" class="sidebar-link" href="/form-builder">
      <span class="material-symbols-outlined">dynamic_form</span>
      <span>Form Builder</span>
    </a>

    <!-- Pilotage -->
    <div class="sidebar-section-label">Pilotage</div>
    <a data-nav-link="/rapports" class="sidebar-link" href="/rapports">
      <span class="material-symbols-outlined">summarize</span>
      <span>Rapports &amp; Exports</span>
    </a>
    <a data-nav-link="/notifications" class="sidebar-link" href="/notifications">
      <span class="material-symbols-outlined">notifications</span>
      <span>Notifications</span>
    </a>

    <!-- Administration -->
    <div class="sidebar-section-label">Administration</div>
    <a data-nav-link="/utilisateurs" class="sidebar-link" href="/utilisateurs">
      <span class="material-symbols-outlined">manage_accounts</span>
      <span>Utilisateurs &amp; Rôles</span>
    </a>
    <a data-nav-link="/securite" class="sidebar-link" href="/securite">
      <span class="material-symbols-outlined">shield_person</span>
      <span>Sécurité &amp; Activité</span>
    </a>
    <a data-nav-link="/parametres" class="sidebar-link" href="/parametres">
      <span class="material-symbols-outlined">settings</span>
      <span>Paramètres</span>
    </a>
  </nav>

  <!-- Bottom Admin User Profile & Logout -->
  <div class="sidebar-user">
    <a href="/profil" class="sidebar-user-inner">
      <div class="sidebar-avatar">
        <span class="material-symbols-outlined" style="font-size:18px;">person</span>
      </div>
      <div class="overflow-hidden">
        <div class="sidebar-user-name">Administrateur</div>
        <div class="sidebar-user-role">Chargement...</div>
      </div>
    </a>
    <button id="btn-sidebar-logout" class="sidebar-logout-btn">
      <span class="material-symbols-outlined">logout</span>
      <span>Déconnexion</span>
    </button>
  </div>
</aside>
`;

// Canonical TopAppBar Header HTML with interactive Dropdown
const CANONICAL_HEADER = `
<header id="admin-topbar" class="topbar">
  <button id="btn-mobile-sidebar" class="mobile-menu-btn" title="Menu navigation">
    <span class="material-symbols-outlined">menu</span>
  </button>

  <div class="topbar-search">
    <span class="material-symbols-outlined">search</span>
    <input id="topbar-search-input" class="topbar-search-input" placeholder="Rechercher dossier, élève, parent (ex: REG-2026-001)..." type="text"/>
  </div>

  <div class="topbar-actions">
    <a href="/notifications" class="topbar-icon-btn" title="Notifications">
      <span class="material-symbols-outlined">notifications</span>
      <span id="topbar-notif-dot" class="topbar-notif-dot hidden"></span>
    </a>

    <!-- Top-right Profile Dropdown Trigger -->
    <div style="position: relative;">
      <button id="btn-topbar-profile" class="topbar-profile-btn">
        <div class="topbar-avatar">
          <span class="material-symbols-outlined" style="font-size:16px;">person</span>
        </div>
        <span class="material-symbols-outlined topbar-chevron">expand_more</span>
      </button>

      <!-- Profile Dropdown Menu -->
      <div id="topbar-profile-menu" class="profile-dropdown">
        <div class="profile-dropdown-header">
          <div class="profile-dropdown-name sidebar-user-name">Administrateur</div>
          <div class="profile-dropdown-email sidebar-user-email">admin@visionschool.dz</div>
        </div>
        <a href="/profil" class="profile-dropdown-item">
          <span class="material-symbols-outlined">person</span>
          <span>Mon profil</span>
        </a>
        <a href="/securite" class="profile-dropdown-item">
          <span class="material-symbols-outlined">shield</span>
          <span>Sécurité &amp; Activité</span>
        </a>
        <div class="profile-dropdown-divider"></div>
        <button id="btn-topbar-logout" class="profile-dropdown-item danger">
          <span class="material-symbols-outlined">logout</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  </div>
</header>
`;

let cachedAdminBranding = {
  siteName: 'ROEYA SCHOOL',
  faviconUrl: null as string | null,
};
let lastAdminBrandFetch = 0;

async function getAdminCachedBranding() {
  const now = Date.now();
  if (now - lastAdminBrandFetch < 10000 && cachedAdminBranding.siteName) {
    return cachedAdminBranding;
  }
  try {
    const res = await fetch(`${API_URL}/api/public/branding`);
    if (res.ok) {
      const data: any = await res.json();
      if (data.success && data.data) {
        cachedAdminBranding = {
          siteName: data.data.siteName || data.data.platformName || 'ROEYA SCHOOL',
          faviconUrl: data.data.faviconUrl || null,
        };
        lastAdminBrandFetch = now;
      }
    }
  } catch (err) {
    // Keep cached
  }
  return cachedAdminBranding;
}

/**
 * Helper to serve view with layout consistency and injected scripts
 */
async function renderView(viewFileName: string, res: Response, statusCode = 200, isProtected = true) {
  const filePath = path.join(VIEWS_DIR, viewFileName);
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    const branding = await getAdminCachedBranding();

    if (branding.siteName && branding.siteName !== 'VISION SCHOOL') {
      html = html.replace(/VISION SCHOOL/g, branding.siteName);
    }

    // Ensure design-system.css is in <head>
    if (!html.includes('design-system.css')) {
      const headInjection = `<link rel="stylesheet" href="/public/css/design-system.css">\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', headInjection);
      }
    }

    // Inject Chart.js CDN for interactive charts
    if (!html.includes('chart.js') && !html.includes('chart.umd')) {
      const chartInjection = `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', chartInjection);
      }
    }

    // For protected routes, unify the layout by replacing static nav/header/aside with canonical components
    if (isProtected) {
      if (html.includes('<aside') || html.includes('<nav')) {
        html = html.replace(/<aside[\s\S]*?<\/aside>/i, CANONICAL_SIDEBAR);
        html = html.replace(/<nav id="admin-sidebar"[\s\S]*?<\/nav>/i, CANONICAL_SIDEBAR);
      }
      if (html.includes('<header')) {
        html = html.replace(/<header[\s\S]*?<\/header>/i, CANONICAL_HEADER);
      }
    }

    // Always inject admin-app.js
    if (!html.includes('admin-app.js')) {
      const injection = `<script src="/public/js/admin-app.js" defer></script>\n</body>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', injection);
      } else {
        html += `<script src="/public/js/admin-app.js" defer></script>`;
      }
    }

    // Ensure protected pages are never cached in browser history (prevents seeing pages after logout)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.status(statusCode).send(html);
  } catch (err) {
    console.error(`[Admin Server View Error] ${viewFileName}:`, err);
    res.status(500).send('<h1>Erreur de chargement de la page administrative</h1>');
  }
}

// ── Authentication Routes (Public) ──
app.get('/login', (req: Request, res: Response) => renderView('login.html', res, 200, false));
app.get('/2fa', (req: Request, res: Response) => renderView('2fa.html', res, 200, false));
app.get('/forgot-password', (req: Request, res: Response) => renderView('forgot-password.html', res, 200, false));
app.get('/reset-password', (req: Request, res: Response) => renderView('reset-password.html', res, 200, false));

// ── Logout Route (Clears session cookie & redirects to login) ──
app.get('/logout', (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'vs_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax');
  res.redirect('/login?logout=1');
});

// ── Protected Admin Routes (Guarded by adminAuthGuard middleware) ──
app.get('/', (req: Request, res: Response) => renderView('dashboard.html', res));
app.get('/dashboard', (req: Request, res: Response) => renderView('dashboard.html', res));

// Inscriptions / Admissions
app.get('/inscriptions', (req: Request, res: Response) => renderView('inscriptions.html', res));
app.get('/inscriptions/nouvelle', (req: Request, res: Response) => renderView('inscription-nouvelle.html', res));
app.get('/inscriptions/:id', (req: Request, res: Response) => renderView('inscription-detail.html', res));

// Waiting list
app.get(['/liste-attente', '/waiting-list'], (req: Request, res: Response) => renderView('liste-attente.html', res));

// Structure
app.get(['/etablissements', '/schools'], (req: Request, res: Response) => renderView('etablissements.html', res));
app.get(['/niveaux-capacites', '/levels-capacities'], (req: Request, res: Response) => renderView('niveaux-capacites.html', res));
app.get(['/annees-scolaires', '/academic-years'], (req: Request, res: Response) => renderView('annees-scolaires.html', res));
app.get(['/tarifs', '/tariffs'], (req: Request, res: Response) => renderView('tarifs.html', res));

// Ressources
app.get('/documents', (req: Request, res: Response) => renderView('documents.html', res));
app.get(['/medias', '/media'], (req: Request, res: Response) => renderView('medias.html', res));
app.get(['/form-builder', '/formulaires'], (req: Request, res: Response) => renderView('form-builder.html', res));

// Pilotage & Reports
app.get(['/rapports', '/reports'], (req: Request, res: Response) => renderView('rapports.html', res));
app.get('/notifications', (req: Request, res: Response) => renderView('notifications.html', res));

// Administration & Settings
app.get(['/utilisateurs', '/users'], (req: Request, res: Response) => renderView('utilisateurs.html', res));
app.get(['/securite', '/security'], (req: Request, res: Response) => renderView('utilisateurs.html', res));
app.get(['/parametres', '/settings'], (req: Request, res: Response) => renderView('parametres.html', res));
app.get(['/profil', '/profile'], (req: Request, res: Response) => renderView('parametres.html', res));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'vision-school-admin', version: '1.0.0' });
});

// Fallback to dashboard for unknown protected routes
app.use((req: Request, res: Response) => renderView('dashboard.html', res));

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🏫 VISION SCHOOL Admin Console running at http://localhost:${PORT}`);
  console.log(`🔗 Connected API target: ${API_URL}`);
});

