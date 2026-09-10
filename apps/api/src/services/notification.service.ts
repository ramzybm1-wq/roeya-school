/**
 * In-App & Admin Notification Service.
 */

import { Notification } from '@vision-school/shared';
import { AdminMockAdapter } from '@vision-school/ui-shared';

export class NotificationService {
  private notifications: Notification[] = AdminMockAdapter.getNotifications();

  async getAdminNotifications(schoolId?: string): Promise<Notification[]> {
    return this.notifications.filter((n) => !n.targetSchoolId || !schoolId || n.targetSchoolId === schoolId);
  }

  async markAsRead(id: string): Promise<void> {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.isRead = true;
  }
}
