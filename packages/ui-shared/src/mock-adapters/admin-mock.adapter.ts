/**
 * Development Mock Data Adapter for Admin Dashboard.
 */

import {
  AuditEvent,
  LevelCapacity,
  LevelTariff,
  Notification,
  Registration,
  RegistrationSummary,
  User,
} from '@vision-school/shared';

export interface DashboardMetrics {
  totalRegistrations: number;
  acceptedRegistrations: number;
  pendingRegistrations: number;
  waitingListCount: number;
  occupancyRatePercent: number;
  totalSeatsOverall: number;
  availableSeatsOverall: number;
}

export class AdminMockAdapter {
  static getDashboardMetrics(): DashboardMetrics {
    return {
      totalRegistrations: 142,
      acceptedRegistrations: 98,
      pendingRegistrations: 34,
      waitingListCount: 10,
      occupancyRatePercent: 82,
      totalSeatsOverall: 250,
      availableSeatsOverall: 45,
    };
  }

  static getRecentRegistrations(): RegistrationSummary[] {
    return [
      {
        id: 'reg_001',
        code: 'REG-2026-000125',
        schoolId: 'school_hydra_01',
        levelId: 'lvl_cp',
        academicYearId: 'ay_2026_2027',
        status: 'PENDING_REVIEW',
        studentFullName: 'Ahmed Benali',
        parentFullName: 'Karim Benali',
        parentPhone: '0550 12 34 56',
        parentEmail: 'karim.benali@email.dz',
        submissionDate: '2026-05-10',
        createdAt: '2026-05-10T14:32:00Z',
      },
      {
        id: 'reg_002',
        code: 'REG-2026-000124',
        schoolId: 'school_hydra_01',
        levelId: 'lvl_ms',
        academicYearId: 'ay_2026_2027',
        status: 'ACCEPTED',
        studentFullName: 'Ines Mansouri',
        parentFullName: 'Samia Mansouri',
        parentPhone: '0661 78 90 12',
        parentEmail: 'samia.m@email.dz',
        submissionDate: '2026-05-09',
        createdAt: '2026-05-09T10:15:00Z',
      },
      {
        id: 'reg_003',
        code: 'REG-2026-000123',
        schoolId: 'school_elbiar_02',
        levelId: 'lvl_1am',
        academicYearId: 'ay_2026_2027',
        status: 'WAITING_LIST',
        studentFullName: 'Yanis Khelifi',
        parentFullName: 'Rachid Khelifi',
        parentPhone: '0770 45 67 89',
        parentEmail: 'rachid.k@email.dz',
        submissionDate: '2026-05-08',
        createdAt: '2026-05-08T16:45:00Z',
      },
    ];
  }

  static getRegistrationDetail(id: string): Registration {
    return {
      id,
      code: 'REG-2026-000125',
      trackingSecretToken: 'tok_sec_1234567890',
      academicYearId: 'ay_2026_2027',
      schoolId: 'school_hydra_01',
      levelId: 'lvl_cp',
      cycleId: 'cycle_primaire',
      status: 'PENDING_REVIEW',
      student: {
        firstNameFr: 'Ahmed',
        lastNameFr: 'Benali',
        firstNameAr: 'أحمد',
        lastNameAr: 'بن علي',
        birthDate: '2020-03-15',
        birthPlaceFr: 'Alger Centre',
        birthPlaceAr: 'الجزائر الوسطى',
        birthWilaya: 'Alger',
        gender: 'MALE',
        nationality: 'Algérienne',
        currentSchool: 'Maternelle Les Écureuils',
      },
      primaryParent: {
        relationship: 'FATHER',
        firstNameFr: 'Karim',
        lastNameFr: 'Benali',
        firstNameAr: 'كريم',
        lastNameAr: 'بن علي',
        email: 'karim.benali@email.dz',
        phonePrimary: '0550 12 34 56',
        profession: 'Ingénieur',
        workplace: 'Sonatrach',
        address: '12, Boulevard des Martyrs',
        city: 'El Biar',
        wilaya: 'Alger',
        isEmergencyContact: true,
      },
      documents: [
        {
          id: 'doc_att_01',
          registrationId: id,
          documentTypeCode: 'BIRTH_CERTIFICATE',
          fileName: 'acte_naissance_ahmed_benali.pdf',
          fileSizeBytes: 1245000,
          mimeType: 'application/pdf',
          storageKey: 'private-documents/2026/reg_001/acte_naissance.pdf',
          validationStatus: 'VALIDATED',
          uploadedAt: '2026-05-10T14:35:00Z',
        },
        {
          id: 'doc_att_02',
          registrationId: id,
          documentTypeCode: 'PARENT_ID',
          fileName: 'cni_parent_benali.pdf',
          fileSizeBytes: 890000,
          mimeType: 'application/pdf',
          storageKey: 'private-documents/2026/reg_001/cni_parent.pdf',
          validationStatus: 'PENDING',
          uploadedAt: '2026-05-10T14:36:00Z',
        },
      ],
      submissionDate: '2026-05-10',
      createdAt: '2026-05-10T14:32:00Z',
      updatedAt: '2026-05-10T14:36:00Z',
    };
  }

  static getLevelCapacities(): LevelCapacity[] {
    return [
      {
        id: 'cap_01',
        schoolId: 'school_hydra_01',
        levelId: 'lvl_ps',
        academicYearId: 'ay_2026_2027',
        totalSeats: 25,
        acceptedSeats: 22,
        pendingReviewSeats: 3,
        reservedSeats: 0,
        availableSeats: 3,
        waitingListCount: 2,
        nearCapacityThresholdPercent: 85,
        isLocked: false,
        alertLevel: 'NEAR_CAPACITY',
        updatedAt: '2026-05-10T00:00:00Z',
      },
      {
        id: 'cap_02',
        schoolId: 'school_hydra_01',
        levelId: 'lvl_cp',
        academicYearId: 'ay_2026_2027',
        totalSeats: 50,
        acceptedSeats: 48,
        pendingReviewSeats: 2,
        reservedSeats: 0,
        availableSeats: 2,
        waitingListCount: 8,
        nearCapacityThresholdPercent: 85,
        isLocked: false,
        alertLevel: 'NEAR_CAPACITY',
        updatedAt: '2026-05-10T00:00:00Z',
      },
    ];
  }

  static getTariffs(): LevelTariff[] {
    return [
      {
        id: 'tar_01',
        schoolId: 'school_hydra_01',
        levelId: 'lvl_cp',
        academicYearId: 'ay_2026_2027',
        currency: 'DZD',
        registrationFee: 35000,
        annualTuitionFee: 320000,
        trimestrialTuitionFee: 110000,
        canteenFeeAnnual: 85000,
        transportFeeAnnual: 75000,
        discountSiblingPercent: 10,
        items: [
          { id: 'fee_1', code: 'INSCRIPTION', nameFr: "Frais d'inscription", nameAr: 'رسوم التسجيل', amount: 35000, isMandatory: true, periodicity: 'ANNUAL' },
          { id: 'fee_2', code: 'SCOLARITE', nameFr: 'Scolarité annuelle', nameAr: 'المصاريف الدراسية السنوية', amount: 320000, isMandatory: true, periodicity: 'ANNUAL' },
        ],
        isPubliclyVisible: true,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
  }

  static getAdminUsers(): User[] {
    return [
      {
        id: 'usr_001',
        email: 'direction@visionschool.dz',
        firstName: 'Nadia',
        lastName: 'Bouzid',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        allowedSchoolIds: [],
        isTwoFactorEnabled: true,
        lastLoginAt: '2026-05-10T08:30:00Z',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'usr_002',
        email: 'secretariat.hydra@visionschool.dz',
        firstName: 'Yasmine',
        lastName: 'Meftah',
        role: 'ADMIN',
        status: 'ACTIVE',
        allowedSchoolIds: ['school_hydra_01'],
        isTwoFactorEnabled: false,
        lastLoginAt: '2026-05-09T16:00:00Z',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
    ];
  }

  static getNotifications(): Notification[] {
    return [
      {
        id: 'notif_01',
        type: 'REGISTRATION_NEW',
        severity: 'INFO',
        titleFr: 'Nouveau dossier soumis',
        messageFr: 'Dossier REG-2026-000125 (Ahmed Benali, 1AP) reçu pour le Campus Hydra.',
        isRead: false,
        createdAt: '2026-05-10T14:32:00Z',
      },
      {
        id: 'notif_02',
        type: 'CAPACITY_ALERT',
        severity: 'WARNING',
        titleFr: 'Niveau presque complet',
        messageFr: 'Le niveau 1AP (CP) atteint 96% de sa capacité.',
        isRead: false,
        createdAt: '2026-05-10T12:00:00Z',
      },
    ];
  }

  static getAuditEvents(): AuditEvent[] {
    return [
      {
        id: 'aud_01',
        action: 'DOCUMENT_VALIDATED',
        performedByUserId: 'usr_002',
        performedByEmail: 'secretariat.hydra@visionschool.dz',
        userRole: 'ADMIN',
        schoolId: 'school_hydra_01',
        targetEntityType: 'DOCUMENT',
        targetEntityId: 'doc_att_01',
        description: 'Acte de naissance validé pour le dossier REG-2026-000125.',
        createdAt: '2026-05-10T15:00:00Z',
      },
    ];
  }
}
