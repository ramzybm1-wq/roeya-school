/**
 * Domain types for Notifications.
 */

export type NotificationType =
  | 'REGISTRATION_NEW'
  | 'REGISTRATION_STATUS_UPDATED'
  | 'DOCUMENT_UPLOADED'
  | 'CAPACITY_ALERT'
  | 'WAITING_LIST_PROMOTION'
  | 'SYSTEM_ALERT';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: string;
  recipientUserId?: string; // If undefined, broadcast to role / school
  targetSchoolId?: string;
  targetRole?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  titleFr: string;
  titleAr?: string;
  messageFr: string;
  messageAr?: string;
  linkUrl?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}
