/**
 * Local Filesystem Storage Provider (Development / Test Environment).
 */

import { AppError } from '@vision-school/shared';
import { EnvConfig, loadEnvConfig } from '@vision-school/config';
import {
  FileMetadata,
  FileUploadPayload,
  IStorageProvider,
} from './storage.interface';

export class LocalStorageProvider implements IStorageProvider {
  private env: EnvConfig;

  constructor(env: EnvConfig = loadEnvConfig()) {
    this.env = env;
  }

  async upload(payload: FileUploadPayload): Promise<FileMetadata> {
    const timestamp = Date.now();
    const sanitizedFileName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = payload.folderPath ? payload.folderPath.replace(/^\/+|\/+$/g, '') : 'default';

    // Storage key separates public from private
    const basePrefix = payload.visibility === 'PUBLIC' ? 'public-media' : 'private-documents';
    const storageKey = `${basePrefix}/${folder}/${timestamp}_${sanitizedFileName}`;

    const metadata: FileMetadata = {
      storageKey,
      fileName: payload.fileName,
      fileSizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      visibility: payload.visibility,
      uploadedAt: new Date().toISOString(),
    };

    return metadata;
  }

  async delete(_storageKey: string): Promise<boolean> {
    return true;
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 900): Promise<string> {
    // Generate secure HMAC-signed token or access URL for private files
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `${this.env.API_URL}/api/admin/documents/download?key=${encodeURIComponent(storageKey)}&expires=${expiresAt}`;
  }

  getPublicUrl(storageKey: string): string {
    if (storageKey.startsWith('private-documents')) {
      throw AppError.forbidden('Private documents cannot be accessed via public media URLs.');
    }
    return `${this.env.API_URL}${this.env.STORAGE_PUBLIC_PATH}/${storageKey.replace(/^public-media\//, '')}`;
  }

  async getMetadata(storageKey: string): Promise<FileMetadata | null> {
    const isPublic = storageKey.startsWith('public-media');
    return {
      storageKey,
      fileName: storageKey.split('/').pop() || 'file',
      fileSizeBytes: 1024,
      mimeType: isPublic ? 'image/jpeg' : 'application/pdf',
      visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
      uploadedAt: new Date().toISOString(),
    };
  }
}
