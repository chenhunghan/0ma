import { useState, useCallback, useRef, useEffect } from 'react';
import type { Notification, NotificationType } from '../types';

interface UseNotificationsOptions {
  maxNotifications?: number;
  defaultAutoClose?: boolean;
  autoCloseDelay?: number;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    maxNotifications = 50,
    defaultAutoClose = true,
    autoCloseDelay = 5000,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear timeout for a notification
  const clearTimeoutForNotification = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Add notification
  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options: {
      autoClose?: boolean;
      actions?: Array<{
        label: string;
        action: () => void;
        variant?: 'primary' | 'secondary' | 'danger';
      }>;
    } = {}
  ) => {
    const id = generateId();
    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      auto_close: options.autoClose ?? defaultAutoClose,
      actions: options.actions,
      read: false,
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      // Keep only the most recent notifications
      return updated.slice(0, maxNotifications);
    });

    // Set auto-close timeout if needed
    if (notification.auto_close) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, autoCloseDelay);
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [generateId, defaultAutoClose, autoCloseDelay, maxNotifications]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    clearTimeoutForNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [clearTimeoutForNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();

    setNotifications([]);
  }, []);

  // Get unread notifications count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title: string, message: string, options = {}) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, options = {}) => {
    return addNotification('error', title, message, { ...options, autoClose: false });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, options = {}) => {
    return addNotification('warning', title, message, options);
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, options = {}) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  // Show notification with promise result
  const showPromiseResult = useCallback(async <T>(
    promise: Promise<T>,
    success: { title: string; message: string },
    error: { title: string; message: string }
  ): Promise<T | null> => {
    try {
      const result = await promise;
      showSuccess(success.title, success.message);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      showError(error.title, `${error.message}: ${errorMessage}`);
      return null;
    }
  }, [showSuccess, showError]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount,
    getNotificationsByType,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPromiseResult,
  };
};