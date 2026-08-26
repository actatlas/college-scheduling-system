import React, { createContext, useContext, useState, useEffect } from "react";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-1",
    title: "AY 2026–2027 1st Semester Active",
    message: "Academic semester timetable configuration and scheduling window is currently active.",
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    link: "/schedules",
  },
  {
    id: "notif-2",
    title: "Timetable Engine Ready",
    message: "Automated constraint solver and conflict prevention matrix initialized successfully.",
    type: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    link: "/schedules",
  },
  {
    id: "notif-3",
    title: "Faculty Load Verification",
    message: "Review part-time and full-time faculty maximum teaching load assignments.",
    type: "warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
    link: "/faculty",
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "srcb_system_notifications";

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
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
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => {
    const newEntry: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newEntry, ...prev.slice(0, 49)]); // keep up to 50
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
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
