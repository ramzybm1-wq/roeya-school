/**
 * School establishment validator.
 */

import { ErrorDetail } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface CreateSchoolInput {
  code: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  slug: string;
  contact: {
    phone: string;
    phoneSecondary?: string;
    whatsapp?: string;
    email: string;
    address: string;
    city: string;
    wilaya: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  settings: {
    isRegistrationOpen: boolean;
    allowWaitingList: boolean;
    publicVisible: boolean;
    googleMapsEmbedUrl?: string;
    primaryLanguage: 'fr' | 'ar';
  };
}

export class SchoolValidator {
  static validate(input: unknown): ValidationResult<CreateSchoolInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid payload' }] };
    }

    const data = input as Partial<CreateSchoolInput>;

    if (!CommonValidator.isNonEmptyString(data.code, 2, 20)) {
      errors.push({ field: 'code', message: "Le code d'établissement est requis (2-20 car)." });
    }
    if (!CommonValidator.isNonEmptyString(data.nameFr, 2)) {
      errors.push({ field: 'nameFr', message: "Le nom de l'établissement (Français) est requis." });
    }
    if (!CommonValidator.isNonEmptyString(data.nameAr, 2)) {
      errors.push({ field: 'nameAr', message: "Le nom de l'établissement (Arabe) est requis." });
    }
    if (!CommonValidator.isNonEmptyString(data.slug, 2)) {
      errors.push({ field: 'slug', message: 'Le slug URL est requis.' });
    }

    const contact = data.contact;
    if (!contact) {
      errors.push({ field: 'contact', message: 'Les coordonnées de contact sont requises.' });
    } else {
      if (!CommonValidator.isValidEmail(contact.email)) {
        errors.push({ field: 'contact.email', message: 'Email de contact invalide.' });
      }
      if (!CommonValidator.isValidPhone(contact.phone)) {
        errors.push({ field: 'contact.phone', message: 'Numéro de téléphone invalide.' });
      }
    }

    const coords = data.coordinates;
    if (coords) {
      if (typeof coords.latitude !== 'number' || coords.latitude < -90 || coords.latitude > 90) {
        errors.push({ field: 'coordinates.latitude', message: 'Latitude invalide (-90 à 90).' });
      }
      if (typeof coords.longitude !== 'number' || coords.longitude < -180 || coords.longitude > 180) {
        errors.push({ field: 'coordinates.longitude', message: 'Longitude invalide (-180 à 180).' });
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as CreateSchoolInput) : undefined,
      errors,
    };
  }
}
