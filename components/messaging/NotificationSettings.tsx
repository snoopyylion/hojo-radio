// components/messaging/NotificationSettings.tsx
'use client';

import React from 'react';
import { Bell, BellOff, Volume2, VolumeX, Monitor, Smartphone } from 'lucide-react';
import { NotificationPermissionState } from '@/hooks/useNotifications';

interface NotificationSettingsProps {
  permissionState: NotificationPermissionState;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  onRequestPermission: () => Promise<boolean>;
  onUpdateSettings: (settings: {
    soundEnabled?: boolean;
    browserNotificationsEnabled?: boolean;
    inAppNotificationsEnabled?: boolean;
  }) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  permissionState,
  soundEnabled,
  browserNotificationsEnabled,
  inAppNotificationsEnabled,
  onRequestPermission,
  onUpdateSettings
}) => {
  const handlePermissionRequest = async () => {
    const granted = await onRequestPermission();
    if (granted) {
      onUpdateSettings({ browserNotificationsEnabled: true });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Settings
        </h3>
      </div>

      <div className="space-y-6">
        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Monitor className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Browser Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified even when the app is not active
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {permissionState.denied && (
              <span className="text-xs text-red-500 mr-2">
                Permission denied
              </span>
            )}
            {permissionState.default && (
              <button
                onClick={handlePermissionRequest}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Enable
              </button>
            )}
            {permissionState.granted && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={browserNotificationsEnabled}
                  onChange={(e) => onUpdateSettings({ browserNotificationsEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            )}
          </div>
        </div>

        {/* In-App Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                In-App Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Show notifications within the app
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={inAppNotificationsEnabled}
              onChange={(e) => onUpdateSettings({ inAppNotificationsEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-gray-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Sound Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Play sounds for new messages and typing
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={soundEnabled}
              onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Permission Help */}
      {permissionState.denied && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <BellOff className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Browser notifications are blocked. To enable them, click the lock icon in your browser&apos;s address bar and allow notifications.
            </p>
          </div>
        </div>
      )}

      {/* Test Notification Button */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            // You can add a test notification here
            console.log('Test notification clicked');
          }}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          Test Notifications
        </button>
      </div>
    </div>
  );
};