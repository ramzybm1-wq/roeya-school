/**
 * Public Website Content Service for VISION SCHOOL.
 * Handles dynamic resolution of Homepage content, School presentations ("Notre École"),
 * educational approach, values, facilities, announcements, structured opening hours,
 * and live "Ouvert maintenant" status in Africa/Algiers timezone.
 */

import { getDb } from '@vision-school/database';
import {
  publicContentBlocks,
  schools,
  academicYears,
  cycles,
  levels,
  schoolYearLevels,
} from '@vision-school/database';
import { eq, and, desc, asc, isNull, inArray } from 'drizzle-orm';
import { AppError } from '@vision-school/shared';
import { MediaService } from './media.service';

export interface OpeningHourSlot {
  day: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  openTime: string; // "08:00"
  closeTime: string; // "16:30"
  isClosed?: boolean;
}

export interface FacilityItem {
  key: string;
  titleFr: string;
  titleAr?: string;
  descriptionFr: string;
  descriptionAr?: string;
  iconName?: string;
}

export interface ValueItem {
  titleFr: string;
  titleAr?: string;
  descriptionFr: string;
  descriptionAr?: string;
  iconName?: string;
}

export class PublicContentService {
  /**
   * Helper: Calculates live open/closed status for Africa/Algiers timezone (UTC+1).
   */
  static calculateOpenNowStatus(openingHours: OpeningHourSlot[] | null | undefined): {
    status: 'OPEN' | 'CLOSED' | 'UNKNOWN';
    currentDay: string;
    todayHours?: string;
  } {
    if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) {
      return { status: 'UNKNOWN', currentDay: '' };
    }

    // Algerian time (UTC+1)
    const now = new Date();
    const algeriaTimeStr = now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' });
    const algeriaDate = new Date(algeriaTimeStr);

    const daysMap: Array<OpeningHourSlot['day']> = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const currentDay = daysMap[algeriaDate.getDay()];
    const currentMinutes = algeriaDate.getHours() * 60 + algeriaDate.getMinutes();

    const todaySlot = openingHours.find((slot) => slot.day === currentDay);

    if (!todaySlot || todaySlot.isClosed) {
      return { status: 'CLOSED', currentDay, todayHours: 'Fermé' };
    }

    const [openH, openM] = todaySlot.openTime.split(':').map(Number);
    const [closeH, closeM] = todaySlot.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

    return {
      status: isOpen ? 'OPEN' : 'CLOSED',
      currentDay,
      todayHours: `${todaySlot.openTime} - ${todaySlot.closeTime}`,
    };
  }

  /**
   * Resolves composite homepage content payload.
   */
  static async getHomePageContent(schoolId?: string, language = 'fr') {
    const db = getDb();

    // 1. Branding (logos, favicon, login background)
    const branding = await MediaService.getPublicBranding(schoolId);

    // 2. Active academic year
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.status, 'ACTIVE'));

    // 3. Active schools
    const activeSchools = await db
      .select()
      .from(schools)
      .where(eq(schools.isActive, true))
      .orderBy(asc(schools.name));

    // 4. Active cycles
    const activeCycles = await db
      .select()
      .from(cycles)
      .where(eq(cycles.isActive, true))
      .orderBy(asc(cycles.displayOrder));

    // 5. Featured Gallery preview (6 images)
    const galleryPreview = await MediaService.getPublicGallery({
      schoolId,
      isFeatured: true,
      limit: 6,
    });

    // 6. Content blocks for Home page
    const contentBlocks = await db
      .select()
      .from(publicContentBlocks)
      .where(
        and(
          eq(publicContentBlocks.page, 'HOME'),
          eq(publicContentBlocks.status, 'PUBLISHED')
        )
      );

    const announcementBlock = contentBlocks.find((b) => b.sectionKey === 'ANNOUNCEMENT_BANNER');
    const valuesBlock = contentBlocks.find((b) => b.sectionKey === 'VALUES');
    const introBlock = contentBlocks.find((b) => b.sectionKey === 'HERO');

    // Default institutional values
    const defaultValues: ValueItem[] = [
      {
        titleFr: 'Excellence Académique',
        titleAr: 'التميز الأكاديمي',
        descriptionFr: 'Programmes enrichis, préparation bilingue et suivi individualisé dès la petite enfance.',
        iconName: 'AcademicCapIcon',
      },
      {
        titleFr: 'Épanouissement & Bien-être',
        titleAr: 'الرعاية والازدهار',
        descriptionFr: 'Un cadre d’apprentissage bienveillant, sécurisé et stimulant pour chaque élève.',
        iconName: 'HeartIcon',
      },
      {
        titleFr: 'Innovation & Technologie',
        titleAr: 'الابتكار والتكنولوجيا',
        descriptionFr: 'Laboratoires scientifiques, robotique et outils pédagogiques numériques de pointe.',
        iconName: 'LightBulbIcon',
      },
    ];

    const values = (valuesBlock?.contentJson as any)?.items || defaultValues;

    return {
      branding,
      activeAcademicYear: activeYear
        ? { id: activeYear.id, name: activeYear.name, isRegistrationOpen: activeYear.status === 'ACTIVE' }
        : null,
      hero: {
        headlineFr:
          (introBlock?.contentJson as any)?.headlineFr ||
          'L’Excellence Éducative pour Construire l’Avenir de Votre Enfant',
        headlineAr:
          (introBlock?.contentJson as any)?.headlineAr ||
          'التميز التربوي لبناء مستقبل واعد لأبنائكم',
        subtitleFr:
          (introBlock?.contentJson as any)?.subtitleFr ||
          'De la maternelle au lycée, découvrez nos campus modernes à Alger et inscrivez votre enfant pour l’année scolaire 2026/2027.',
        subtitleAr:
          (introBlock?.contentJson as any)?.subtitleAr ||
          'من الروضة إلى الثانوي، اكتشفوا مجمعاتنا التعليمية بالجزائر وسجلوا أبناءكم للعام الدراسي 2026/2027.',
        ctaLabelFr: 'Inscrire mon enfant',
        ctaLabelAr: 'تسجيل تلميذ',
        media: branding.hero,
      },
      announcementBanner: announcementBlock
        ? {
            isActive: true,
            messageFr: (announcementBlock.contentJson as any)?.messageFr || 'Inscriptions ouvertes pour l’année 2026/2027.',
            messageAr: (announcementBlock.contentJson as any)?.messageAr || 'التسجيلات مفتوحة للعام الدراسي 2026/2027.',
            buttonLabelFr: (announcementBlock.contentJson as any)?.buttonLabelFr || 'Je m’inscris',
            buttonTarget: (announcementBlock.contentJson as any)?.buttonTarget || '/admissions/inscription',
          }
        : null,
      values,
      activeCycles: activeCycles.map((c) => ({
        id: c.id,
        code: c.code,
        nameFr: c.nameFr,
        nameAr: c.nameAr,
        descriptionFr: (c as any).descriptionFr || null,
        minAgeYears: (c as any).minAgeYears || null,
        maxAgeYears: (c as any).maxAgeYears || null,
      })),
      schools: activeSchools.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        address: s.address,
        commune: s.commune,
        wilaya: s.wilaya,
        phone: s.isPhonePublic ? s.phonePrimary : null,
        email: s.isEmailPublic ? s.emailPrimary : null,
        whatsapp: s.isWhatsappPublic ? s.whatsapp : null,
        gpsCoordinates: s.isMapPublic ? `${s.latitude},${s.longitude}` : null,
      })),
      galleryPreview,
    };
  }

  /**
   * Resolves detailed school presentation ("Notre École").
   */
  static async getSchoolPresentation(schoolId: string, language = 'fr') {
    const db = getDb();
    const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));
    if (!school) throw new AppError('NOT_FOUND', 'Établissement introuvable.');

    // 1. Opening status
    const openStatus = this.calculateOpenNowStatus(school.openingHoursJson as any);

    // 2. Content blocks for this school (or global fallbacks)
    const contentBlocks = await db
      .select()
      .from(publicContentBlocks)
      .where(
        and(
          eq(publicContentBlocks.page, 'ABOUT'),
          eq(publicContentBlocks.status, 'PUBLISHED')
        )
      );

    const facilitiesBlock = contentBlocks.find(
      (b) => b.sectionKey === 'FACILITIES' && (!b.schoolId || b.schoolId === schoolId)
    );
    const approachBlock = contentBlocks.find(
      (b) => b.sectionKey === 'EDUCATIONAL_APPROACH' && (!b.schoolId || b.schoolId === schoolId)
    );
    const valuesBlock = contentBlocks.find(
      (b) => b.sectionKey === 'VALUES' && (!b.schoolId || b.schoolId === schoolId)
    );

    // Default facilities
    const defaultFacilities: FacilityItem[] = [
      {
        key: 'classrooms',
        titleFr: 'Salles de classe connectées',
        descriptionFr: 'Écrans interactifs, mobilier ergonomique et climatisation réversible.',
        iconName: 'DesktopComputerIcon',
      },
      {
        key: 'laboratories',
        titleFr: 'Laboratoires de Sciences & Robotique',
        descriptionFr: 'Matériel d’expérimentation moderne pour la physique, chimie et programmation.',
        iconName: 'BeakerIcon',
      },
      {
        key: 'sports',
        titleFr: 'Espaces Sportifs Omnisports',
        descriptionFr: 'Terrains de football, basketball et salle de gymnastique sécurisée.',
        iconName: 'TrophyIcon',
      },
      {
        key: 'canteen',
        titleFr: 'Restauration Scolaire Équilibrée',
        descriptionFr: 'Menus sains élaborés par des nutritionnistes et préparés sur place.',
        iconName: 'UtensilsIcon',
      },
    ];

    const facilities = (facilitiesBlock?.contentJson as any)?.items || defaultFacilities;

    // 3. School media preview
    const gallery = await MediaService.getPublicGallery({ schoolId, limit: 8 });
    const heroMedia = await MediaService.getPublicPlacementMedia('CLIENT_HERO', schoolId);

    return {
      school: {
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        description: school.description,
        address: school.address,
        wilaya: school.wilaya,
        commune: school.commune,
        phone: school.isPhonePublic ? school.phonePrimary : null,
        whatsapp: school.isWhatsappPublic ? school.whatsapp : null,
        email: school.isEmailPublic ? school.emailPrimary : null,
        website: school.website,
        googleMapsUrl: school.isMapPublic ? school.googleMapsUrl : null,
        socialLinks: school.socialLinksJson || {},
        openingHours: school.openingHoursJson || [],
        openStatus,
      },
      heroMedia,
      educationalApproach: {
        titleFr: (approachBlock?.contentJson as any)?.titleFr || 'Notre Projet Pédagogique',
        titleAr: (approachBlock?.contentJson as any)?.titleAr || 'مشروعنا التربوي',
        descriptionFr:
          (approachBlock?.contentJson as any)?.descriptionFr ||
          'À VISION SCHOOL, nous combinons l’exigence du programme national avec une ouverture internationale et des méthodes actives favorisant l’autonomie et l’esprit critique.',
      },
      values: (valuesBlock?.contentJson as any)?.items || [],
      facilities,
      gallery,
    };
  }
}
