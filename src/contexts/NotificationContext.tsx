import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserRole } from "../types";
import { api } from "../data/apiClient";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
  link?: string;
  targetRole?: UserRole | "all" | string;
  targetProgram?: string;
  targetUserId?: string;
  targetTeacherId?: string;
}

interface NotificationContextType {
  notifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const STORAGE_KEY = "srcb_system_notifications";

function isNotificationAuthorizedForUser(
  notif: SystemNotification,
  userRole: string,
  userProgram: string,
  userId: string | null,
  userTeacherId: string | null
): boolean {
  // 1. Direct User ID targeting
  if (notif.targetUserId) {
    return userId ? String(notif.targetUserId) === String(userId) : false;
  }

  // 2. Direct Teacher ID targeting
  if (notif.targetTeacherId) {
    return userTeacherId ? String(notif.targetTeacherId).toLowerCase() === String(userTeacherId).toLowerCase() : false;
  }

  // 3. Role-based scoping
  const targetRoles = String(notif.targetRole || "all")
    .toLowerCase()
    .split(",")
    .map((r) => r.trim());

  if (targetRoles.includes("all") || targetRoles.length === 0 || !notif.targetRole) {
    if (notif.targetProgram && notif.targetProgram !== "ALL") {
      if (userRole === "program_head") {
        return String(notif.targetProgram).toUpperCase() === userProgram.toUpperCase();
      }
      return userRole === "super_admin" || userRole === "admin";
    }
    return true;
  }

  // Strict role boundaries
  if (userRole === "super_admin") {
    return targetRoles.includes("super_admin") || targetRoles.includes("all");
  }

  if (userRole === "admin") {
    if (targetRoles.includes("super_admin") && !targetRoles.includes("admin") && !targetRoles.includes("all")) {
      return false;
    }
    return targetRoles.includes("admin") || targetRoles.includes("all");
  }

  if (userRole === "program_head") {
    if (targetRoles.includes("super_admin")) return false;

    if (targetRoles.includes("program_head")) {
      if (notif.targetProgram && notif.targetProgram !== "ALL") {
        return String(notif.targetProgram).toUpperCase() === userProgram.toUpperCase();
      }
      return true;
    }

    return targetRoles.includes("all");
  }

  return false;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allNotifications, setAllNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [activeRole, setActiveRole] = useState<string>(() => localStorage.getItem("userRole") || "admin");
  const [activeProgram, setActiveProgram] = useState<string>(() => localStorage.getItem("userProgram") || "ITP");
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(() => localStorage.getItem("teacherId"));
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem("userId"));

  const fetchRemoteNotifications = useCallback(async () => {
    try {
      const role = localStorage.getItem("userRole") || "admin";
      const program = localStorage.getItem("userProgram") || "ITP";
      const teacherId = localStorage.getItem("teacherId");
      const userId = localStorage.getItem("userId");

      setActiveRole(role);
      setActiveProgram(program);
      setActiveTeacherId(teacherId);
      setActiveUserId(userId);

      const query = new URLSearchParams({
        role: role || "",
        program: program || "",
        ...(teacherId ? { teacherId } : {}),
        ...(userId ? { userId } : {}),
      }).toString();

      const res = await api.get(`/notifications?${query}`).catch(() => null);

      if (res?.data?.data && Array.isArray(res.data.data)) {
        setAllNotifications((prev) => {
          const remoteList: SystemNotification[] = res.data.data;
          const merged = [...remoteList];
          for (const localItem of prev) {
            if (!merged.some((m) => m.id === localItem.id)) {
              merged.push(localItem);
            }
          }
          return merged;
        });
      }
    } catch {
      // fallback to local state
    }
  }, []);

  useEffect(() => {
    fetchRemoteNotifications();
    const handleStorageUpdate = () => {
      fetchRemoteNotifications();
    };
    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("scheduling_storage_update", handleStorageUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("scheduling_storage_update", handleStorageUpdate);
    };
  }, [fetchRemoteNotifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotifications));
  }, [allNotifications]);

  // Strictly filter notifications for the currently active user role & scope
  const filteredNotifications = allNotifications.filter((n) =>
    isNotificationAuthorizedForUser(n, activeRole, activeProgram, activeUserId, activeTeacherId)
  );

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => {
    const newEntry: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setAllNotifications((prev) => [newEntry, ...prev.slice(0, 49)]);

    api.post("/notifications", notif).catch(() => {
      // gracefully handled in background
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    api.patch(`/notifications/${encodeURIComponent(id)}/read`, { userId: activeUserId }).catch(() => {});
  }, [activeUserId]);

  const markAllAsRead = useCallback(() => {
    const visibleIds = new Set(filteredNotifications.map((n) => n.id));
    setAllNotifications((prev) =>
      prev.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n))
    );
    api.patch("/notifications/mark-all-read", { userId: activeUserId }).catch(() => {});
  }, [filteredNotifications, activeUserId]);

  const clearNotification = useCallback((id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    api.delete(`/notifications/${encodeURIComponent(id)}`).catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    const visibleIds = new Set(filteredNotifications.map((n) => n.id));
    setAllNotifications((prev) => prev.filter((n) => !visibleIds.has(n.id)));
  }, [filteredNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: filteredNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        refreshNotifications: fetchRemoteNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
