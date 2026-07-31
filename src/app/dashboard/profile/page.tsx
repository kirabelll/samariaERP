'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';
import { User, Mail, Phone, Shield, Building2, Clock, Send, Eye, EyeOff } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  role: string;
  department?: string;
  branch?: string;
  telegramChatId?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/me');
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setFirstName(json.data.firstName || '');
        setMiddleName(json.data.middleName || '');
        setLastName(json.data.lastName || '');
        setPhone(json.data.phone || '');
        setEmail(json.data.email || '');
        setTelegramChatId(json.data.telegramChatId || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { firstName, middleName, lastName, phone, email, telegramChatId };

      if (showPasswordSection && newPassword) {
        if (newPassword !== confirmPassword) {
          alert('New passwords do not match');
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          alert('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        alert('Profile updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
        fetchProfile();
      } else {
        alert(json.error || 'Failed to update profile');
      }
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId) {
      alert('Please enter your Telegram Chat ID first');
      return;
    }
    setTestingTelegram(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message', chatId: telegramChatId, botToken: '__use_saved__' }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Test message sent! Check your Telegram.');
      } else {
        alert('Failed to send test: ' + (json.data?.error || json.error || 'Unknown error'));
      }
    } catch {
      alert('Failed to send test message');
    } finally {
      setTestingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Overview */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
              {profile?.firstName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.firstName} {profile?.middleName} {profile?.lastName}
              </h2>
              <p className="text-sm text-gray-500">@{profile?.username}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  {profile?.role}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  profile?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {profile?.status}
                </span>
              </div>
            </div>
            <div className="text-center sm:text-right text-xs text-gray-500">
              {profile?.department && <p>Dept: {profile.department}</p>}
              {profile?.branch && <p>Branch: {profile.branch}</p>}
              {profile?.lastLogin && (
                <p className="mt-1">Last login: {new Date(profile.lastLogin).toLocaleString('en-US')}</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" /> Personal Information
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
              <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />Email
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />Phone
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251..." />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Telegram Notifications */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5" /> Telegram Notifications
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Telegram account to receive real-time notifications for your role-specific events
            (orders, approvals, payments, etc.).
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
            <div className="flex gap-2">
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g., 123456789"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestTelegram}
                disabled={testingTelegram || !telegramChatId}
              >
                {testingTelegram ? 'Sending...' : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Open Telegram and message <b>@wonde_samaria</b> → send <code>/start</code> to get your Chat ID, or send <code>/link {profile?.username || 'your_username'}</code> to auto-connect.
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">Notifications you will receive based on your role ({profile?.role}):</p>
            <NotificationRoleInfo role={profile?.role || ''} />
          </div>
        </CardBody>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Security
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              {showPasswordSection ? 'Cancel' : 'Change Password'}
            </Button>
          </div>
        </CardHeader>
        {showPasswordSection && (
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function NotificationRoleInfo({ role }: { role: string }) {
  const roleNotifications: Record<string, string[]> = {
    ADMIN: ['All sales, purchasing, finance, HR, medical, cement, aggregate events', 'All approval requests'],
    MANAGER: ['All sales, purchasing, finance, HR, medical, cement, aggregate events', 'All approval requests'],
    SALES: ['New orders, invoices, payments, deliveries', 'Approval results'],
    PROCUREMENT: ['Purchase orders, goods receiving', 'Approval results'],
    FINANCE: ['Payments, journal entries, bank transactions, VAT', 'Sales invoices', 'Approval results'],
    HR: ['Leave requests, payroll, attendance, advances', 'Approval results'],
    MEDICAL_PHARMACIST: ['Medical requests, store updates, pricing', 'Approval results'],
    MEDICAL_DRUGGIST: ['Medical requests, store updates, pricing', 'Approval results'],
    WAREHOUSE: ['Goods receiving, cement liftings, aggregate dispatch', 'Approval results'],
    AUDITOR: ['Financial events, system events'],
  };

  const items = roleNotifications[role] || ['General system notifications'];

  return (
    <ul className="list-disc list-inside space-y-0.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
