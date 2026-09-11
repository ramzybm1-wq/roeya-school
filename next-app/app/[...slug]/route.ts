import { NextRequest, NextResponse } from 'next/server';
import { renderClientView, renderAdminView } from '@/lib/view-renderer';

const CLIENT_PAGES: Record<string, string> = {
  'notre-ecole': 'notre-ecole.html',
  'niveaux-admissions': 'niveaux-admissions.html',
  'galerie': 'galerie.html',
  'faq': 'faq.html',
  'contact': 'contact.html',
  'confidentialite': 'confidentialite.html',
  'connexion': 'connexion.html',
  'mon-espace': 'mon-espace.html',
  'inscription': 'inscription-step1.html',
  'inscription/eleve': 'inscription-step2.html',
  'inscription/parent': 'inscription-step3.html',
  'inscription/documents': 'inscription-step4.html',
  'inscription/confirmation': 'inscription-step5.html',
  'suivi': 'suivi.html',
  'maintenance': 'maintenance.html',
  'offline': 'offline.html',
};

const CLIENT_PROTECTED_PREFIXES = ['inscription', 'mon-espace'];

const ADMIN_PAGES: Record<string, string> = {
  'login': 'login.html',
  '2fa': '2fa.html',
  'forgot-password': 'forgot-password.html',
  'reset-password': 'reset-password.html',
  'dashboard': 'dashboard.html',
  'inscriptions': 'inscriptions.html',
  'inscriptions/nouvelle': 'inscription-nouvelle.html',
  'liste-attente': 'liste-attente.html',
  'waiting-list': 'liste-attente.html',
  'etablissements': 'etablissements.html',
  'schools': 'etablissements.html',
  'niveaux-capacites': 'niveaux-capacites.html',
  'levels-capacities': 'niveaux-capacites.html',
  'annees-scolaires': 'annees-scolaires.html',
  'academic-years': 'annees-scolaires.html',
  'tarifs': 'tarifs.html',
  'tariffs': 'tarifs.html',
  'documents': 'documents.html',
  'medias': 'medias.html',
  'media': 'medias.html',
  'form-builder': 'form-builder.html',
  'formulaires': 'form-builder.html',
  'rapports': 'rapports.html',
  'reports': 'rapports.html',
  'notifications': 'notifications.html',
  'utilisateurs': 'utilisateurs.html',
  'users': 'utilisateurs.html',
  'securite': 'utilisateurs.html',
  'security': 'utilisateurs.html',
  'parametres': 'parametres.html',
  'settings': 'parametres.html',
  'profil': 'parametres.html',
  'profile': 'parametres.html',
};

const ADMIN_PUBLIC_PAGES = ['login', '2fa', 'forgot-password', 'reset-password'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join('/');

  // If path starts with api, ignore (handled by app/api routes)
  if (slug[0] === 'api') {
    return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle Logout
  if (path === 'logout' || path === 'admin/logout') {
    const res = NextResponse.redirect(new URL('/login?logout=1', req.url));
    res.cookies.delete('vs_admin_session');
    res.cookies.delete('vs_client_session');
    return res;
  }

  // Handle /admin base URL -> redirects to /dashboard (or /login if not authenticated)
  if (path === 'admin') {
    const adminToken = req.cookies.get('vs_admin_session')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Normalize path if prefixed with 'admin/' (e.g. /admin/dashboard -> dashboard, /admin/login -> login)
  const lookupPath = path.startsWith('admin/') ? path.slice(6) : path;

  // Check Admin Routes
  if (ADMIN_PAGES[lookupPath]) {
    const isPublic = ADMIN_PUBLIC_PAGES.includes(lookupPath);
    const adminToken = req.cookies.get('vs_admin_session')?.value;

    if (isPublic) {
      if (lookupPath === 'login' && adminToken && !req.nextUrl.searchParams.has('logout')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return renderAdminView(ADMIN_PAGES[lookupPath], 200, false);
    }

    // Protected Admin Route
    if (!adminToken) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent('/' + lookupPath)}`, req.url));
    }

    return renderAdminView(ADMIN_PAGES[lookupPath], 200, true);
  }

  // Check Dynamic Admin Route: /inscriptions/:id or /admin/inscriptions/:id
  const isDynamicInscription =
    (slug[0] === 'inscriptions' && slug.length === 2 && slug[1] !== 'nouvelle') ||
    (slug[0] === 'admin' && slug[1] === 'inscriptions' && slug.length === 3 && slug[2] !== 'nouvelle');

  if (isDynamicInscription) {
    const adminToken = req.cookies.get('vs_admin_session')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent('/' + path)}`, req.url));
    }
    return renderAdminView('inscription-detail.html', 200, true);
  }

  // Check Client Routes
  if (CLIENT_PAGES[path]) {
    const isProtected = CLIENT_PROTECTED_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'));
    const clientToken = req.cookies.get('vs_client_session')?.value;

    if (isProtected && !clientToken) {
      return NextResponse.redirect(new URL(`/connexion?redirect=${encodeURIComponent('/' + path)}`, req.url));
    }

    return renderClientView(CLIENT_PAGES[path]);
  }

  // 404 Fallback
  return renderClientView('404.html', 404);
}
