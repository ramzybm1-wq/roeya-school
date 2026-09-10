import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || (process.env.NODE_ENV === 'production' ? 'http://api:4000' : 'http://localhost:4000');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VIEWS_DIR = fs.existsSync(path.join(process.cwd(), 'views'))
  ? path.join(process.cwd(), 'views')
  : path.join(__dirname, '..', 'views');
const PUBLIC_DIR = fs.existsSync(path.join(process.cwd(), 'public'))
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '..', 'public');

// Serve static assets (both /public and root)
app.use('/public', express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));

let cachedBranding: { siteName: string; faviconUrl: string | null; clientLogoUrl: string | null; updatedAt?: string } = {
  siteName: 'ROEYA SCHOOL',
  faviconUrl: null,
  clientLogoUrl: null,
};
let lastBrandFetch = 0;

async function getCachedBranding() {
  const now = Date.now();
  if (now - lastBrandFetch < 10000 && cachedBranding.siteName) {
    return cachedBranding;
  }
  try {
    const res = await fetch(`${API_URL}/api/public/branding?t=${now}`);
    if (res.ok) {
      const data: any = await res.json();
      if (data.success && data.data) {
        cachedBranding = {
          siteName: data.data.siteName || data.data.platformName || 'ROEYA SCHOOL',
          faviconUrl: data.data.faviconUrl || null,
          clientLogoUrl: data.data.clientLogoUrl || null,
          updatedAt: data.data.updatedAt || String(now),
        };
        lastBrandFetch = now;
      }
    }
  } catch (err) {
    // Keep cached
  }
  return cachedBranding;
}

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
    console.error(`[Client API Proxy Error] ${req.originalUrl}:`, err);
    res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: 'API inaccessible' } });
  }
});

// Helper to serve view with injected client script and live branding
async function renderView(viewFileName: string, res: Response, statusCode = 200) {
  const filePath = path.join(VIEWS_DIR, viewFileName);
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    const branding = await getCachedBranding();

    if (branding.siteName && branding.siteName !== 'VISION SCHOOL') {
      html = html.replace(/VISION SCHOOL/g, branding.siteName);
    }

    // Pre-inject Client Logo if configured
    if (branding.clientLogoUrl) {
      const fullLogoUrl = branding.clientLogoUrl.startsWith('http')
        ? branding.clientLogoUrl
        : `${API_URL}${branding.clientLogoUrl.startsWith('/') ? '' : '/'}${branding.clientLogoUrl}`;
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

    // Pre-inject Favicon if configured
    if (branding.faviconUrl) {
      const fullFaviconUrl = branding.faviconUrl.startsWith('http')
        ? branding.faviconUrl
        : `${API_URL}${branding.faviconUrl.startsWith('/') ? '' : '/'}${branding.faviconUrl}`;
      if (!html.includes('rel="icon"') && !html.includes("rel='icon'")) {
        html = html.replace('</head>', `<link rel="icon" href="${fullFaviconUrl}">\n</head>`);
      }
    }

    // Ensure design-system.css is in <head>
    if (!html.includes('design-system.css')) {
      const headInjection = `<link rel="stylesheet" href="/public/css/design-system.css">\n</head>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', headInjection);
      }
    }

    if (!html.includes('client-app.js')) {
      const injection = `<script src="/public/js/client-app.js" defer></script></body>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', injection);
      } else {
        html += `<script src="/public/js/client-app.js" defer></script>`;
      }
    }
    res.status(statusCode).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    res.status(500).send('<h1>Erreur de chargement de la page</h1>');
  }
}

// Public Client Routes
app.get('/', (req: Request, res: Response) => renderView('index.html', res));
app.get('/notre-ecole', (req: Request, res: Response) => renderView('notre-ecole.html', res));
app.get('/niveaux-admissions', (req: Request, res: Response) => renderView('niveaux-admissions.html', res));
app.get('/galerie', (req: Request, res: Response) => renderView('galerie.html', res));
app.get('/faq', (req: Request, res: Response) => renderView('faq.html', res));
app.get('/contact', (req: Request, res: Response) => renderView('contact.html', res));
app.get('/confidentialite', (req: Request, res: Response) => renderView('confidentialite.html', res));

// Auth middleware checking session cookie
function requireClientAuth(req: Request, res: Response, next: any) {
  const cookieHeader = req.headers.cookie || '';
  if (!cookieHeader.includes('vs_client_session=')) {
    const originalUrl = req.originalUrl || req.url;
    return res.redirect(`/connexion?redirect=${encodeURIComponent(originalUrl)}`);
  }
  next();
}

// Client Auth & Dashboard
app.get('/connexion', (req: Request, res: Response) => renderView('connexion.html', res));
app.get('/mon-espace', requireClientAuth, (req: Request, res: Response) => renderView('mon-espace.html', res));

// Multi-step Registration Funnel (Guarded: Parent account required)
app.get('/inscription', requireClientAuth, (req: Request, res: Response) => renderView('inscription-step1.html', res));
app.get('/inscription/eleve', requireClientAuth, (req: Request, res: Response) => renderView('inscription-step2.html', res));
app.get('/inscription/parent', requireClientAuth, (req: Request, res: Response) => renderView('inscription-step3.html', res));
app.get('/inscription/documents', requireClientAuth, (req: Request, res: Response) => renderView('inscription-step4.html', res));
app.get('/inscription/confirmation', requireClientAuth, (req: Request, res: Response) => renderView('inscription-step5.html', res));

// Public Tracking
app.get('/suivi', (req: Request, res: Response) => renderView('suivi.html', res));

// System Status
app.get('/maintenance', (req: Request, res: Response) => renderView('maintenance.html', res));
app.get('/offline', (req: Request, res: Response) => renderView('offline.html', res));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'vision-school-client', version: '1.0.0' });
});

// 404 Handler
app.use((req: Request, res: Response) => renderView('404.html', res, 404));

// 500 Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[CLIENT SERVER ERROR]', err);
  renderView('500.html', res, 500);
});

if (!process.env.VERCEL) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🎓 VISION SCHOOL Client Portal running at http://localhost:${PORT}`);
    console.log(`🔗 Connected API target: ${API_URL}`);
  });
}

export default app;

