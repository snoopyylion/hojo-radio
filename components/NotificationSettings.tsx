// components/NotificationSettings.tsx
'use client';

import React from 'react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';
import { Volume2, Monitor, Smartphone, Mail } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const { notificationSettings, updateNotificationSettings } = useGlobalNotifications();

  const handleToggle = (key: string, value: boolean) => {
    updateNotificationSettings({ [key]: value });
  };

  const handleNotificationTypeToggle = (type: string, value: boolean) => {
    updateNotificationSettings({
      notificationTypes: {
        ...notificationSettings.notificationTypes,
        [type]: value
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Notification Settings</h2>
      
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">General Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Sound Notifications</p>
                  <p className="text-sm text-gray-500">Play sound when receiving notifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.soundEnabled}
                onChange={(e) => handleToggle('soundEnabled', e.target.checked)}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-gray-500">Show desktop notifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.browserNotificationsEnabled}
                onChange={(e) => handleToggle('browserNotificationsEnabled', e.target.checked)}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-gray-500">Show notifications within the app</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.inAppNotificationsEnabled}
                onChange={(e) => handleToggle('inAppNotificationsEnabled', e.target.checked)}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                className="toggle"
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
          
          <div className="space-y-3">
            {Object.entries(notificationSettings.notificationTypes).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize">{type.replace('_', ' ')}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleNotificationTypeToggle(type, e.target.checked)}
                  className="toggle"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};