/**
 * Public Media Gallery and Settings Route Handlers.
 */

import { createSuccessResponse } from '@vision-school/shared';
import { MediaService } from '../../services/media.service';
import { SettingsService } from '../../services/settings.service';

export class PublicGalleryRouter {
  async list(schoolId?: string) {
    const media = await MediaService.getPublicGallery({ schoolId });
    return createSuccessResponse(media);
  }
}

export class PublicSettingsRouter {
  constructor(private settingsService = new SettingsService()) {}

  async get() {
    const settings = await this.settingsService.getPublicSettings();
    return createSuccessResponse(settings);
  }
}
