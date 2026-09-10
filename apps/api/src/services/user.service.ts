/**
 * Admin User and Role Service.
 */

import { AppError, User } from '@vision-school/shared';
import { AdminMockAdapter } from '@vision-school/ui-shared';

export class UserService {
  private users: User[] = AdminMockAdapter.getAdminUsers();

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: string): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw AppError.notFound('User', id);
    }
    return user;
  }
}
