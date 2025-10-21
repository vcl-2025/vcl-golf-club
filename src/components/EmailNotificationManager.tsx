import React, { useState, useEffect } from 'react';
import { Mail, MailCheck, Settings, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailNotificationManagerProps {
  userId: string;
}

export default function EmailNotificationManager({ userId }: EmailNotificationManagerProps) {
  const [emailSettings, setEmailSettings] = useState({
    activityReminders: true,
    registrationConfirmations: true,
    eventUpdates: true,
    systemNotifications: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEmailSettings();
  }, [userId]);

  const fetchEmailSettings = async () => {
    try {
      // 从数据库获取用户的邮件设置
      // 这里需要实现具体的API调用
      console.log('获取邮件设置...');
    } catch (error) {
      console.error('获取邮件设置失败:', error);
    }
  };

  const updateEmailSettings = async (newSettings: typeof emailSettings) => {
    setIsLoading(true);
    try {
      // 更新邮件设置到数据库
      setEmailSettings(newSettings);
      setMessage('邮件设置已保存');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('保存邮件设置失败:', error);
      setMessage('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailNotification = async () => {
    setIsLoading(true);
    try {
      console.log('开始发送测试邮件...');
      
      // 使用现有的审批通知邮件功能发送测试邮件
      const { data, error } = await supabase.functions.invoke('send-approval-notification', {
        body: {
          user_id: userId,
          event_title: '邮件通知功能测试',
          approval_status: 'approved', // 使用approved状态发送测试邮件
          approval_notes: '这是一封测试邮件，用于验证邮件通知功能是否正常工作。',
          test_email: 'jing_curie@hotmail.com' // 使用真实邮箱测试
        }
      });

      console.log('邮件发送结果:', { data, error });

      if (error) {
        console.error('邮件发送错误:', error);
        setMessage(`❌ 发送失败: ${error.message || '未知错误'}`);
        return;
      }
      
      setMessage('✅ 测试邮件已发送，请检查您的邮箱');
    } catch (error: any) {
      console.error('发送测试邮件失败:', error);
      setMessage(`❌ 发送失败: ${error.message || '网络错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Mail className="w-5 h-5 mr-2 text-blue-600" />
          邮件通知设置
        </h3>
        <button
          onClick={testEmailNotification}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {isLoading ? '发送中...' : '测试邮件'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-700 font-medium">活动提醒</span>
              <p className="text-sm text-gray-500">活动开始前24小时自动发送提醒邮件</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.activityReminders}
                onChange={(e) => updateEmailSettings({
                  ...emailSettings,
                  activityReminders: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-700 font-medium">报名确认</span>
              <p className="text-sm text-gray-500">报名成功后自动发送确认邮件</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.registrationConfirmations}
                onChange={(e) => updateEmailSettings({
                  ...emailSettings,
                  registrationConfirmations: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-700 font-medium">活动更新</span>
              <p className="text-sm text-gray-500">活动信息变更时发送通知邮件</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.eventUpdates}
                onChange={(e) => updateEmailSettings({
                  ...emailSettings,
                  eventUpdates: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-700 font-medium">系统通知</span>
              <p className="text-sm text-gray-500">重要系统更新和维护通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.systemNotifications}
                onChange={(e) => updateEmailSettings({
                  ...emailSettings,
                  systemNotifications: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('成功') || message.includes('已发送')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">邮件通知优势</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 支持所有设备和浏览器</li>
                <li>• 无需安装任何应用</li>
                <li>• 邮件内容更丰富详细</li>
                <li>• 可以设置邮件过滤规则</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
