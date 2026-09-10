/**
 * Admin Sidebar Navigation Component.
 * Visually consistent with Stitch sidebar: 280px fixed, Deep Navy, Professional Blue active bar.
 */

import { TRANSLATIONS } from '@vision-school/ui-shared';

export interface SidebarNavItem {
  key: string;
  labelFr: string;
  labelAr: string;
  href: string;
  icon: string;
}

export function AdminSidebar(props: { currentPath?: string; collapsed?: boolean; locale?: 'fr' | 'ar' }) {
  const t = TRANSLATIONS[props.locale || 'fr'].adminNav;

  const navItems: SidebarNavItem[] = [
    { key: 'dashboard', labelFr: t.dashboard, labelAr: 'لوحة التحكم', href: '/admin', icon: 'dashboard' },
    { key: 'registrations', labelFr: t.registrations, labelAr: 'التسجيلات', href: '/admin/inscriptions', icon: 'assignment' },
    { key: 'schools', labelFr: t.schools, labelAr: 'المؤسسات', href: '/admin/etablissements', icon: 'school' },
    { key: 'levels', labelFr: t.levelsCapacities, labelAr: 'المستويات', href: '/admin/niveaux', icon: 'layers' },
    { key: 'tariffs', labelFr: t.tariffs, labelAr: 'الرسوم', href: '/admin/tarifs', icon: 'payments' },
    { key: 'years', labelFr: t.academicYears, labelAr: 'السنوات الدراسية', href: '/admin/annees', icon: 'calendar_today' },
    { key: 'waitingList', labelFr: t.waitingList, labelAr: 'قائمة الانتظار', href: '/admin/liste-attente', icon: 'hourglass_empty' },
    { key: 'documents', labelFr: t.documents, labelAr: 'الوثائق', href: '/admin/documents', icon: 'folder' },
    { key: 'media', labelFr: t.media, labelAr: 'الوسائط', href: '/admin/medias', icon: 'perm_media' },
    { key: 'users', labelFr: t.usersRoles, labelAr: 'المستخدمون', href: '/admin/utilisateurs', icon: 'people' },
    { key: 'notifications', labelFr: t.notifications, labelAr: 'الإشعارات', href: '/admin/notifications', icon: 'notifications' },
    { key: 'reports', labelFr: t.reports, labelAr: 'التقارير', href: '/admin/rapports', icon: 'bar_chart' },
    { key: 'security', labelFr: t.security, labelAr: 'الأمان', href: '/admin/securite', icon: 'security' },
    { key: 'settings', labelFr: t.settings, labelAr: 'الإعدادات', href: '/admin/parametres', icon: 'settings' },
  ];

  return {
    componentName: 'AdminSidebar',
    collapsed: props.collapsed || false,
    width: props.collapsed ? '80px' : '280px',
    currentPath: props.currentPath,
    items: navItems,
    brandName: 'VISION SCHOOL',
    brandSubtitle: 'Administration',
  };
}
