// components/NotificationPermission.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export const NotificationPermission: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  if (permission === 'granted') {
    return null; // Don't show if already granted
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">Enable Notifications</h4>
          <p className="text-sm text-blue-700">
            Get notified when you receive new messages and updates
          </p>
        </div>
        <button
          onClick={requestPermission}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Enable
        </button>
      </div>
    </div>
  );
};