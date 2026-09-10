/**
 * Storage Service Factory.
 */

import { EnvConfig, loadEnvConfig } from '@vision-school/config';
import { LocalStorageProvider } from './local-storage.provider';
import { IStorageProvider } from './storage.interface';

export class StorageService {
  private static provider: IStorageProvider | null = null;

  static getProvider(env: EnvConfig = loadEnvConfig()): IStorageProvider {
    if (!StorageService.provider) {
      if (env.STORAGE_DRIVER === 's3' && env.STORAGE_S3_BUCKET) {
        // S3 Provider can be instantiated here when cloud storage is configured
        StorageService.provider = new LocalStorageProvider(env);
      } else {
        StorageService.provider = new LocalStorageProvider(env);
      }
    }
    return StorageService.provider;
  }
}
