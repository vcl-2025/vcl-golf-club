import React, { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import EmailNotificationManager from './EmailNotificationManager';

interface NotificationManagerProps {
  userId: string;
}

export default function NotificationManager({ userId }: NotificationManagerProps) {
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'both'>('email');

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center mb-4">
        <Bell className="w-5 h-5 text-golf-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">通知设置</h3>
      </div>

      <div className="space-y-4">
        {/* 通知方式选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            通知方式
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="notificationMethod"
                value="email"
                checked={notificationMethod === 'email'}
                onChange={(e) => setNotificationMethod(e.target.value as 'email')}
                className="mr-2"
              />
              <Mail className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm">仅邮件通知</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="notificationMethod"
                value="both"
                checked={notificationMethod === 'both'}
                onChange={(e) => setNotificationMethod(e.target.value as 'both')}
                className="mr-2"
              />
              <Bell className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm">邮件 + 推送通知</span>
            </label>
          </div>
        </div>

        {/* 邮件通知设置 */}
        {notificationMethod === 'email' || notificationMethod === 'both' ? (
          <EmailNotificationManager userId={userId} />
        ) : null}
      </div>
    </div>
  );
}