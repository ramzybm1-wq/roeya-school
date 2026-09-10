/**
 * Development Mock Data Adapter for Client Public Website.
 */

import {
  Cycle,
  Level,
  MediaAsset,
  PublicPlatformSettings,
  PublicTrackingResponse,
  School,
} from '@vision-school/shared';

export class ClientMockAdapter {
  static getPlatformSettings(): PublicPlatformSettings {
    return {
      activeAcademicYearCode: '2026/2027',
      defaultLanguage: 'fr',
      supportedLanguages: ['fr', 'ar'],
      contactEmail: 'contact@visionschool.dz',
      contactPhone: '023 48 12 34',
      platformName: 'VISION SCHOOL',
      allowPublicRegistration: true,
      googleMapsEnabled: true,
    };
  }

  static getSchools(): School[] {
    return [
      {
        id: 'school_hydra_01',
        code: 'VS-HYDRA',
        nameFr: 'VISION SCHOOL - Campus Hydra',
        nameAr: 'مدرسة فيزيون - مجمع حيدرة',
        descriptionFr: "Campus principal d'excellence éducative, accueillant les cycles Préparatoire, Primaire et Moyen.",
        descriptionAr: 'المجمع الرئيسي للتميز التعليمي، يرحب بالأطوار التحضيري والابتدائي والمتوسط.',
        slug: 'campus-hydra',
        logoUrl: '/images/schools/hydra-logo.png',
        coverImageUrl: '/images/schools/hydra-hero.jpg',
        contact: {
          phone: '023 48 12 34',
          whatsapp: '+213560123456',
          email: 'hydra@visionschool.dz',
          address: '14, Rue des Pins, Hydra',
          city: 'Hydra',
          wilaya: 'Alger',
        },
        coordinates: { latitude: 36.7456, longitude: 3.0278 },
        settings: {
          isRegistrationOpen: true,
          allowWaitingList: true,
          publicVisible: true,
          googleMapsEmbedUrl: 'https://maps.google.com/?q=36.7456,3.0278',
          primaryLanguage: 'fr',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'school_elbiar_02',
        code: 'VS-ELBIAR',
        nameFr: 'VISION SCHOOL - Campus El Biar',
        nameAr: 'مدرسة فيزيون - مجمع الأبيار',
        descriptionFr: 'Campus secondaire et collège bilingue avec infrastructures sportives et laboratoires.',
        descriptionAr: 'مجمع مخصص للتعليم المتوسط والثانوي مع مرافق رياضية متطورة.',
        slug: 'campus-el-biar',
        logoUrl: '/images/schools/elbiar-logo.png',
        coverImageUrl: '/images/schools/elbiar-hero.jpg',
        contact: {
          phone: '023 79 56 78',
          whatsapp: '+213560789012',
          email: 'elbiar@visionschool.dz',
          address: '28, Avenue Ali Khodja, El Biar',
          city: 'El Biar',
          wilaya: 'Alger',
        },
        coordinates: { latitude: 36.7689, longitude: 3.0321 },
        settings: {
          isRegistrationOpen: true,
          allowWaitingList: true,
          publicVisible: true,
          googleMapsEmbedUrl: 'https://maps.google.com/?q=36.7689,3.0321',
          primaryLanguage: 'fr',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
  }

  static getCycles(): Cycle[] {
    return [
      { id: 'cycle_preparatoire', code: 'PREPARATOIRE', nameFr: 'Cycle Préscolaire & Maternelle', nameAr: 'الطور التحضيري والروضة', order: 1 },
      { id: 'cycle_primaire', code: 'PRIMAIRE', nameFr: 'Cycle Primaire', nameAr: 'الطور الابتدائي', order: 2 },
      { id: 'cycle_moyen', code: 'MOYEN', nameFr: 'Cycle Moyen (Collège)', nameAr: 'الطور المتوسط', order: 3 },
      { id: 'cycle_secondaire', code: 'SECONDAIRE', nameFr: 'Cycle Secondaire (Lycée)', nameAr: 'الطور الثانوي', order: 4 },
    ];
  }

  static getLevels(): Level[] {
    return [
      { id: 'lvl_ps', cycleId: 'cycle_preparatoire', code: 'PS', nameFr: 'Petite Section', nameAr: 'القسم الصغير', order: 1, isActive: true },
      { id: 'lvl_ms', cycleId: 'cycle_preparatoire', code: 'MS', nameFr: 'Moyenne Section', nameAr: 'القسم المتوسط', order: 2, isActive: true },
      { id: 'lvl_gs', cycleId: 'cycle_preparatoire', code: 'GS', nameFr: 'Grande Section / Préscolaire', nameAr: 'القسم الكبير / التحضيري', order: 3, isActive: true },
      { id: 'lvl_cp', cycleId: 'cycle_primaire', code: '1AP', nameFr: '1ère Année Primaire (CP)', nameAr: 'السنة الأولى ابتدائي', order: 4, isActive: true },
      { id: 'lvl_ce1', cycleId: 'cycle_primaire', code: '2AP', nameFr: '2ème Année Primaire (CE1)', nameAr: 'السنة الثانية ابتدائي', order: 5, isActive: true },
      { id: 'lvl_1am', cycleId: 'cycle_moyen', code: '1AM', nameFr: '1ère Année Moyenne', nameAr: 'السنة الأولى متوسط', order: 9, isActive: true },
      { id: 'lvl_1as', cycleId: 'cycle_secondaire', code: '1AS', nameFr: '1ère Année Secondaire', nameAr: 'السنة الأولى ثانوي', order: 13, isActive: true },
    ];
  }

  static getGalleryAssets(): MediaAsset[] {
    return [
      {
        id: 'media_01',
        titleFr: 'Activités scientifiques et robotique',
        altTextFr: 'Élèves en laboratoire robotique',
        category: 'ACTIVITIES',
        mediaType: 'IMAGE',
        urls: { original: '/images/gallery/robotique.jpg' },
        fileSizeBytes: 1024000,
        mimeType: 'image/jpeg',
        isPublished: true,
        order: 1,
        tags: ['robotique', 'sciences'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
  }

  static getTrackingMock(code: string): PublicTrackingResponse {
    return {
      code,
      status: 'PENDING_REVIEW',
      submissionDate: '2026-05-10',
      studentInitials: 'A. B.',
      schoolNameFr: 'VISION SCHOOL - Campus Hydra',
      schoolNameAr: 'مدرسة فيزيون - مجمع حيدرة',
      levelNameFr: '1ère Année Primaire (CP)',
      levelNameAr: 'السنة الأولى ابتدائي',
      academicYearLabel: '2026 / 2027',
      statusLabelFr: 'Dossier en cours d’examen',
      statusLabelAr: 'الملف قيد الدراسة',
      statusDescriptionFr: 'Votre dossier a été reçu avec succès et est actuellement examiné par la commission pédagogique.',
      statusDescriptionAr: 'تم استلام ملفكم بنجاح وهو حاليا قيد الدراسة من قبل اللجنة التربوية.',
      updatedAt: '2026-05-11T10:00:00Z',
    };
  }
}
