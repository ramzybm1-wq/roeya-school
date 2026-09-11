import path from 'path';
import fs from 'fs';
import prisma from './prisma';

// Canonical ROEYA / VISION SCHOOL Sidebar HTML
export const CANONICAL_SIDEBAR = `
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
export const CANONICAL_HEADER = `
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

let cachedBranding: {
  siteName: string;
  faviconUrl: string | null;
  clientLogoUrl: string | null;
  adminLogoUrl: string | null;
  updatedAt?: string;
} = {
  siteName: 'ROEYA SCHOOL',
  faviconUrl: null,
  clientLogoUrl: null,
  adminLogoUrl: null,
};
let lastBrandFetch = 0;

export async function getCachedBranding() {
  const now = Date.now();
  if (now - lastBrandFetch < 10000 && cachedBranding.siteName) {
    return cachedBranding;
  }
  try {
    const rows = await prisma.system_settings.findMany({
      where: {
        key: {
          in: ['branding:platform_name', 'branding:site_name', 'branding:client_logo_url', 'branding:admin_logo_url', 'branding:favicon_url'],
        },
      },
    });

    const settingsMap: Record<string, any> = {};
    for (const r of rows) {
      if (r.value_json) {
        const val = typeof r.value_json === 'object' ? (r.value_json as any).value : r.value_json;
        settingsMap[r.key] = val;
      }
    }

    const siteName = settingsMap['branding:site_name'] || settingsMap['branding:platform_name'] || 'ROEYA SCHOOL';
    const clientLogoUrl = settingsMap['branding:client_logo_url'] || null;
    const adminLogoUrl = settingsMap['branding:admin_logo_url'] || null;
    const faviconUrl = settingsMap['branding:favicon_url'] || null;

    cachedBranding = {
      siteName,
      faviconUrl,
      clientLogoUrl,
      adminLogoUrl,
      updatedAt: String(now),
    };
    lastBrandFetch = now;
  } catch {
    // Keep fallback
  }
  return cachedBranding;
}

const VIEWS_BASE = path.join(process.cwd(), 'views');

export async function renderClientView(viewFileName: string, statusCode = 200): Promise<Response> {
  const filePath = path.join(VIEWS_BASE, 'client', viewFileName);
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    const branding = await getCachedBranding();

    if (branding.siteName && branding.siteName !== 'VISION SCHOOL') {
      html = html.replace(/VISION SCHOOL/g, branding.siteName);
    }

    if (branding.clientLogoUrl) {
      const fullLogoUrl = branding.clientLogoUrl;
      const v = branding.updatedAt ? encodeURIComponent(branding.updatedAt) : Date.now();
      const versionedLogo = fullLogoUrl.includes('?') ? `${fullLogoUrl}&v=${v}` : `${fullLogoUrl}?v=${v}`;
      
      const logoImgTag = `<img src="${versionedLogo}" alt="${branding.siteName}" class="client-logo-img" style="max-height:100%;max-width:100%;object-fit:contain;border-radius:inherit;display:block;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';" /><span class="material-symbols-outlined fallback-icon" style="display:none;">school</span>`;
      
      html = html.replace(
        /<div class="client-brand-icon"><span class="material-symbols-outlined">school<\/span><\/div>/g,
        `<div class="client-brand-icon">${logoImgTag}</div>`
      );
      html = html.replace(
        /<div class="auth-brand-icon client-brand-icon">\s*<span class="material-symbols-outlined">school<\/span>\s*<\/div>/g,
        `<div class="auth-brand-icon client-brand-icon">${logoImgTag}</div>`
      );
    }

    if (branding.faviconUrl) {
      const fullFaviconUrl = branding.faviconUrl;
      if (!html.includes('rel="icon"') && !html.includes("rel='icon'")) {
        html = html.replace('</head>', `<link rel="icon" href="${fullFaviconUrl}">\n</head>`);
      }
    }

    if (!html.includes('design-system.css')) {
      const headInjection = `<link rel="stylesheet" href="/css/design-system.css">\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', headInjection);
      }
    }

    // Fix /public/ script and style references so they match Next.js public directory
    html = html.replace(/\/public\/css\//g, '/css/');
    html = html.replace(/\/public\/js\//g, '/js/');

    if (!html.includes('client-app.js')) {
      const injection = `<script src="/js/client-app.js" defer></script></body>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', injection);
      } else {
        html += `<script src="/js/client-app.js" defer></script>`;
      }
    }

    return new Response(html, {
      status: statusCode,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    console.error(`[Render Client View Error] ${viewFileName}:`, err);
    return new Response('<h1>Erreur de chargement de la page</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

export async function renderAdminView(viewFileName: string, statusCode = 200, isProtected = true): Promise<Response> {
  const filePath = path.join(VIEWS_BASE, 'admin', viewFileName);
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    const branding = await getCachedBranding();

    if (branding.siteName && branding.siteName !== 'VISION SCHOOL') {
      html = html.replace(/VISION SCHOOL/g, branding.siteName);
    }

    if (!html.includes('design-system.css')) {
      const headInjection = `<link rel="stylesheet" href="/css/design-system.css">\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', headInjection);
      }
    }

    if (!html.includes('chart.js') && !html.includes('chart.umd')) {
      const chartInjection = `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', chartInjection);
      }
    }

    if (isProtected) {
      if (html.includes('<aside') || html.includes('<nav')) {
        html = html.replace(/<aside[\s\S]*?<\/aside>/i, CANONICAL_SIDEBAR);
        html = html.replace(/<nav id="admin-sidebar"[\s\S]*?<\/nav>/i, CANONICAL_SIDEBAR);
      }
      if (html.includes('<header')) {
        html = html.replace(/<header[\s\S]*?<\/header>/i, CANONICAL_HEADER);
      }
    }

    // Fix /public/ references so they match Next.js public directory
    html = html.replace(/\/public\/css\//g, '/css/');
    html = html.replace(/\/public\/js\//g, '/js/');

    if (!html.includes('admin-app.js')) {
      const injection = `<script src="/js/admin-app.js" defer></script>\n</body>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', injection);
      } else {
        html += `<script src="/js/admin-app.js" defer></script>`;
      }
    }

    return new Response(html, {
      status: statusCode,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error(`[Render Admin View Error] ${viewFileName}:`, err);
    return new Response('<h1>Erreur de chargement de la page administrative</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
