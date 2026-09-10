/**
 * Unified Storage Provider Interface.
 * Enforces strict separation between Public Media and Private Registration Documents.
 */

export type StorageVisibility = 'PUBLIC' | 'PRIVATE';

export interface FileUploadPayload {
  buffer: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
  visibility: StorageVisibility;
  folderPath?: string;
  metadata?: Record<string, string>;
}

export interface FileMetadata {
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  visibility: StorageVisibility;
  uploadedAt: string;
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer to storage.
   */
  upload(payload: FileUploadPayload): Promise<FileMetadata>;

  /**
   * Deletes a file by its storageKey.
   */
  delete(storageKey: string): Promise<boolean>;

  /**
   * Generates a signed, time-limited URL for private registration documents.
   * Access to private documents MUST always be authorized.
   */
  getSignedDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Returns direct public URL for public media assets (never private documents).
   */
  getPublicUrl(storageKey: string): string;

  /**
   * Reads metadata for a file.
   */
  getMetadata(storageKey: string): Promise<FileMetadata | null>;
}
