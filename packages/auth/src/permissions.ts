/**
 * Permission definitions and descriptions for RBAC.
 */

import { PermissionCode } from '@vision-school/shared';

export interface PermissionDefinition {
  code: PermissionCode;
  nameFr: string;
  nameAr: string;
  category: 'REGISTRATION' | 'CAPACITY' | 'FINANCE' | 'DOCUMENTS' | 'MEDIA' | 'ADMIN' | 'SYSTEM';
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    code: 'dashboard.read',
    nameFr: 'Consulter le tableau de bord',
    nameAr: 'عرض لوحة التحكم',
    category: 'ADMIN',
  },
  {
    code: 'registration.read',
    nameFr: 'Consulter les dossiers d’inscription',
    nameAr: 'عرض ملفات التسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'registration.create',
    nameFr: 'Créer un dossier d’inscription',
    nameAr: 'إنشاء ملف تسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'registration.update',
    nameFr: 'Modifier un dossier d’inscription',
    nameAr: 'تعديل ملف تسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'registration.accept',
    nameFr: 'Accepter une inscription',
    nameAr: 'قبول طلب التسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'registration.refuse',
    nameFr: 'Refuser une inscription',
    nameAr: 'رفض طلب التسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'registration.delete',
    nameFr: 'Supprimer / archiver un dossier',
    nameAr: 'حذف أو أرشفة ملف تسجيل',
    category: 'REGISTRATION',
  },
  {
    code: 'waiting_list.manage',
    nameFr: 'Gérer la liste d’attente',
    nameAr: 'إدارة قائمة الانتظار',
    category: 'REGISTRATION',
  },
  {
    code: 'capacity.read',
    nameFr: 'Consulter les capacités et places',
    nameAr: 'عرض الطاقة الاستيعابية',
    category: 'CAPACITY',
  },
  {
    code: 'capacity.manage',
    nameFr: 'Modifier les capacités des niveaux',
    nameAr: 'تعديل الطاقة الاستيعابية',
    category: 'CAPACITY',
  },
  {
    code: 'tariff.read',
    nameFr: 'Consulter les tarifs',
    nameAr: 'عرض الرسوم الدراسية',
    category: 'FINANCE',
  },
  {
    code: 'tariff.manage',
    nameFr: 'Gérer la grille tarifaire',
    nameAr: 'إدارة جدول الرسوم',
    category: 'FINANCE',
  },
  {
    code: 'document.read',
    nameFr: 'Consulter les pièces justificatives',
    nameAr: 'عرض الوثائق المرفقة',
    category: 'DOCUMENTS',
  },
  {
    code: 'document.validate',
    nameFr: 'Valider ou rejeter un document',
    nameAr: 'المصادقة على الوثائق أو رفضها',
    category: 'DOCUMENTS',
  },
  {
    code: 'media.read',
    nameFr: 'Consulter la médiathèque',
    nameAr: 'عرض مكتبة الوسائط',
    category: 'MEDIA',
  },
  {
    code: 'media.manage',
    nameFr: 'Téléverser et organiser les médias',
    nameAr: 'رفع وإدارة الوسائط',
    category: 'MEDIA',
  },
  {
    code: 'media.publish',
    nameFr: 'Publier des médias sur le site public',
    nameAr: 'نشر الوسائط على الموقع العام',
    category: 'MEDIA',
  },
  {
    code: 'form.manage',
    nameFr: 'Gérer les formulaires d’inscription',
    nameAr: 'إدارة استمارات التسجيل',
    category: 'ADMIN',
  },
  {
    code: 'form.publish',
    nameFr: 'Publier des formulaires d’inscription',
    nameAr: 'نشر استمارات التسجيل',
    category: 'ADMIN',
  },
  {
    code: 'contact.manage',
    nameFr: 'Gérer les messages de contact',
    nameAr: 'إدارة رسائل التواصل',
    category: 'ADMIN',
  },
  {
    code: 'content.manage',
    nameFr: 'Gérer les contenus du site public',
    nameAr: 'إدارة محتويات الموقع',
    category: 'ADMIN',
  },
  {
    code: 'school.manage',
    nameFr: 'Gérer les établissements et coordonnées',
    nameAr: 'إدارة المؤسسات التعليمية',
    category: 'ADMIN',
  },
  {
    code: 'academic_year.manage',
    nameFr: 'Gérer les années scolaires',
    nameAr: 'إدارة السنوات الدراسية',
    category: 'ADMIN',
  },
  {
    code: 'users.read',
    nameFr: 'Consulter les utilisateurs administratifs',
    nameAr: 'عرض المستخدمين',
    category: 'ADMIN',
  },
  {
    code: 'users.manage',
    nameFr: 'Créer et modifier des utilisateurs',
    nameAr: 'إدارة المستخدمين وحساباتهم',
    category: 'ADMIN',
  },
  {
    code: 'roles.manage',
    nameFr: 'Gérer les rôles et permissions',
    nameAr: 'إدارة الأدوار والصلاحيات',
    category: 'ADMIN',
  },
  {
    code: 'report.read',
    nameFr: 'Consulter les rapports et aperçus',
    nameAr: 'عرض التقارير والإحصائيات',
    category: 'ADMIN',
  },
  {
    code: 'report.export',
    nameFr: 'Exporter des rapports (Excel, CSV, PDF)',
    nameAr: 'تصدير التقارير',
    category: 'ADMIN',
  },
  {
    code: 'reports.export',
    nameFr: 'Exporter des rapports et statistiques',
    nameAr: 'تصدير التقارير والإحصائيات',
    category: 'ADMIN',
  },
  {
    code: 'reports.read',
    nameFr: 'Consulter les rapports',
    nameAr: 'عرض التقارير',
    category: 'ADMIN',
  },
  {
    code: 'security.manage',
    nameFr: 'Gérer la sécurité et journaux d’audit',
    nameAr: 'إدارة الأمان وسجلات النشاط',
    category: 'SYSTEM',
  },
  {
    code: 'settings.manage',
    nameFr: 'Gérer les paramètres de la plateforme',
    nameAr: 'إدارة إعدادات المنصة',
    category: 'SYSTEM',
  },
  {
    code: 'audit.read',
    nameFr: 'Consulter les journaux d’audit',
    nameAr: 'عرض سجلات التدقيق',
    category: 'SYSTEM',
  },
];
