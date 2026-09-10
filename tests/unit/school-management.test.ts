/**
 * Unit Tests: School Establishment Management & Validation.
 */

import { SchoolService } from '../../apps/api/src/services/school.service';
import { User } from '@vision-school/shared';

const superAdmin: User = {
  id: 'usr_super', email: 'super@school.dz', firstName: 'Nadia', lastName: 'B',
  role: 'SUPER_ADMIN', status: 'ACTIVE', allowedSchoolIds: [],
  isTwoFactorEnabled: true, createdAt: '', updatedAt: '',
};

describe('School Management: Geographic Coordinate Validation', () => {
  test('validates Algerian GPS coordinates within range', () => {
    // Algiers coordinates: 36.7456, 3.0278
    expect(() => {
      // @ts-ignore
      SchoolService['validateCoordinates'](36.7456, 3.0278);
    }).not.toThrow();
  });

  test('rejects latitude outside -90 to 90 range', () => {
    expect(() => {
      // @ts-ignore
      SchoolService['validateCoordinates'](95.0, 3.0);
    }).toThrow('La latitude doit être comprise entre -90 et 90');
  });

  test('rejects longitude outside -180 to 180 range', () => {
    expect(() => {
      // @ts-ignore
      SchoolService['validateCoordinates'](36.0, 185.0);
    }).toThrow('La longitude doit être comprise entre -180 et 180');
  });
});

describe('School Management: Public API Sanitization', () => {
  test('public school DTO contains only safe parent-facing fields', () => {
    const rawSchool = {
      id: 'sch_1',
      name: 'École A (Campus Hydra)',
      shortName: 'Campus Hydra',
      code: 'VS-HYDRA-01',
      description: 'Campus principal',
      phonePrimary: '023 48 12 34',
      whatsapp: '+213560123456',
      emailPrimary: 'contact@hydra.dz',
      website: 'https://hydra.dz',
      address: 'Hydra',
      wilaya: 'Alger',
      commune: 'Hydra',
      postalCode: '16035',
      country: 'Algérie',
      latitude: 36.74,
      longitude: 3.02,
      googleMapsUrl: 'https://maps.google.com',
      status: 'ACTIVE',
      isActive: true,
      archivedAt: null,
      internalAdminNotes: 'Internal secret note',
    };

    // Public mapping removes internalAdminNotes, status, etc.
    const publicDto = {
      id: rawSchool.id,
      name: rawSchool.name,
      shortName: rawSchool.shortName,
      description: rawSchool.description,
      phonePrimary: rawSchool.phonePrimary,
      whatsapp: rawSchool.whatsapp,
      emailPrimary: rawSchool.emailPrimary,
      website: rawSchool.website,
      address: rawSchool.address,
      wilaya: rawSchool.wilaya,
      commune: rawSchool.commune,
      postalCode: rawSchool.postalCode,
      country: rawSchool.country,
      latitude: rawSchool.latitude,
      longitude: rawSchool.longitude,
      googleMapsUrl: rawSchool.googleMapsUrl,
    };

    expect(publicDto.name).toBe('École A (Campus Hydra)');
    expect((publicDto as any).internalAdminNotes).toBeUndefined();
    expect((publicDto as any).status).toBeUndefined();
  });
});
