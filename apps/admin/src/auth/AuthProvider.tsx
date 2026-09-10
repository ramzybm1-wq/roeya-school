/**
 * Admin Authentication Context & Hooks for VISION SCHOOL Dashboard.
 * Integrates with `/api/admin/auth/*` endpoints and enforces client-side permission guards
 * while server-side authorization remains the final authority.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, PermissionCode } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface AdminAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  permissions: PermissionCode[];
  allowedSchoolIds: string[];
  login: (email: string, password: string) => Promise<{ requires2Fa: boolean; challengeToken?: string }>;
  verify2Fa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionCode) => boolean;
  canAccessSchool: (schoolId: string) => boolean;
  isSuperAdmin: () => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode; apiBaseUrl?: string }> = ({
  children,
  apiBaseUrl = '/api/admin',
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [allowedSchoolIds, setAllowedSchoolIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
          setPermissions(json.data.permissions || []);
          setAllowedSchoolIds(json.data.allowedSchoolIds || []);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Identifiants invalides.');
    }

    if (json.data.requires2Fa) {
      return { requires2Fa: true, challengeToken: json.data.challengeToken };
    }

    if (json.data.user) {
      setUser(json.data.user);
      setPermissions(json.data.user.permissions || []);
      setAllowedSchoolIds(json.data.user.allowedSchoolIds || []);
    }

    return { requires2Fa: false };
  };

  const verify2Fa = async (challengeToken: string, code: string) => {
    const res = await fetch(`${apiBaseUrl}/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, code }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Code 2FA invalide.');
    }

    if (json.data.user) {
      setUser(json.data.user);
      setPermissions(json.data.user.permissions || []);
      setAllowedSchoolIds(json.data.user.allowedSchoolIds || []);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, { method: 'POST' });
    } finally {
      setUser(null);
      setPermissions([]);
      setAllowedSchoolIds([]);
    }
  };

  const hasPermission = (permission: PermissionCode): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  };

  const canAccessSchool = (schoolId: string): boolean => {
    if (!user) return false;
    return AuthGuard.canAccessSchool(user, schoolId);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'SUPER_ADMIN';
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role: user?.role || null,
        permissions,
        allowedSchoolIds,
        login,
        verify2Fa,
        logout,
        hasPermission,
        canAccessSchool,
        isSuperAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

export function useHasPermission(permission: PermissionCode): boolean {
  const { hasPermission } = useAdminAuth();
  return hasPermission(permission);
}

export function useCanAccessSchool(schoolId: string): boolean {
  const { canAccessSchool } = useAdminAuth();
  return canAccessSchool(schoolId);
}
