/**
 * Unified Storage Service for VISION SCHOOL.
 * - Manages PRIVATE student registration documents (strictly protected, HMAC-SHA256 temporary access tokens).
 * - Manages PUBLIC visual media assets (logos, heroes, backgrounds, gallery images with responsive variants).
 * Zero overlap between private student PDFs and public visual media.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StorageMetadata {
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  originalFilename: string;
  createdAt: Date;
}

export interface SignedTokenPayload {
  documentId: string;
  storageKey: string;
  action: 'preview' | 'download';
  filename?: string;
  expiresAt: number; // Unix timestamp in ms
}

export class StorageService {
  private static readonly SIGNING_SECRET = process.env.STORAGE_SIGNING_SECRET || 'vision_school_private_doc_secret_key_2026';
  private static readonly BASE_PRIVATE_DIR = path.resolve(process.cwd(), 'apps/api/storage/private');
  private static readonly BASE_PUBLIC_DIR = path.resolve(process.cwd(), 'apps/api/storage/public');

  // In-memory buffer caches for fast retrieval & tests
  private static privateMemoryStorage = new Map<string, { buffer: Buffer; mimeType: string }>();
  private static publicMemoryStorage = new Map<string, { buffer: Buffer; mimeType: string }>();

  // ─── PRIVATE STORAGE (Student Documents) ───────────────────────────────────

  static async uploadPrivate(
    storageKey: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<{ storageKey: string; fileSizeBytes: number }> {
    this.privateMemoryStorage.set(storageKey, { buffer, mimeType });

    try {
      const fullPath = path.join(this.BASE_PRIVATE_DIR, storageKey);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, buffer);
    } catch {}

    return {
      storageKey,
      fileSizeBytes: buffer.length,
    };
  }

  static async getPrivateBuffer(storageKey: string): Promise<Buffer | null> {
    const memory = this.privateMemoryStorage.get(storageKey);
    if (memory) return memory.buffer;

    const fullPath = path.join(this.BASE_PRIVATE_DIR, storageKey);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
    return null;
  }

  static async deletePrivate(storageKey: string): Promise<void> {
    this.privateMemoryStorage.delete(storageKey);
    const fullPath = path.join(this.BASE_PRIVATE_DIR, storageKey);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }
  }

  static createTemporarySignedToken(
    documentId: string,
    storageKey: string,
    action: 'preview' | 'download',
    filename?: string,
    expiresInSeconds = 900
  ): string {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload: SignedTokenPayload = {
      documentId,
      storageKey,
      action,
      filename,
      expiresAt,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.SIGNING_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  static createTemporarySignedUrl(
    documentId: string,
    storageKey: string,
    action: 'preview' | 'download',
    filename?: string,
    expiresInSeconds = 900
  ): string {
    const token = this.createTemporarySignedToken(documentId, storageKey, action, filename, expiresInSeconds);
    return `/api/public/documents/secure-stream/${token}`;
  }

  static verifySignedToken(token: string): {
    valid: boolean;
    payload?: SignedTokenPayload;
    error?: string;
  } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false, error: 'Format de jeton invalide.' };
      }

      const [payloadBase64, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', this.SIGNING_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { valid: false, error: 'Signature de jeton invalide ou corrompue.' };
      }

      const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload: SignedTokenPayload = JSON.parse(jsonStr);

      if (Date.now() > payload.expiresAt) {
        return { valid: false, error: 'Ce lien d’accès temporaire a expiré (durée de validité : 15 min).' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Impossible de décoder le jeton de sécurité.' };
    }
  }

  static buildDocumentStorageKey(
    registrationId: string,
    documentTypeId: string,
    versionNumber: number,
    extension = 'pdf'
  ): string {
    return `private/registrations/${registrationId}/documents/${documentTypeId}/v${versionNumber}.${extension}`;
  }

  // ─── PUBLIC STORAGE (Media & Branding Visuals) ─────────────────────────────

  static async uploadPublicMedia(
    storageKey: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<{ storageKey: string; fileSizeBytes: number; publicUrl: string }> {
    this.publicMemoryStorage.set(storageKey, { buffer, mimeType });

    try {
      const fullPath = path.join(this.BASE_PUBLIC_DIR, storageKey);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, buffer);
    } catch {}

    const publicUrl = `/api/public/media/stream/${storageKey}`;
    return {
      storageKey,
      fileSizeBytes: buffer.length,
      publicUrl,
    };
  }

  static async getPublicMediaBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const memory = this.publicMemoryStorage.get(storageKey);
    if (memory) return memory;

    const fullPath = path.join(this.BASE_PUBLIC_DIR, storageKey);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(storageKey).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.avif') mimeType = 'image/avif';
      return { buffer, mimeType };
    }
    return null;
  }

  static buildPublicMediaKey(
    mediaId: string,
    variant: 'original' | 'desktop' | 'tablet' | 'mobile',
    extension = 'jpg'
  ): string {
    return `public/media/${mediaId}/${variant}.${extension}`;
  }
}
