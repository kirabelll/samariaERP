'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Badge, Table } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { Send, Settings, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface TelegramSettings {
  configured: boolean;
  enabled: boolean;
  maskedToken: string;
}

interface Notification {
  id: string;
  recipientId: string;
  chatId: string;
  module: string;
  event: string;
  message: string;
  status: string;
  errorMsg: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'settings' | 'log'>('settings');
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form
  const [botToken, setBotToken] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [verifyResult, setVerifyResult] = useState<string>('');

  // Filters
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'MANAGER';

  useEffect(() => {
    fetchSettings();
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [page, filterModule, filterStatus]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/telegram');
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch { /* ignore */ }
  };

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterModule) params.set('module', filterModule);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!botToken) { alert('Enter a bot token'); return; }
    setSaving(true);
    setVerifyResult('');
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_token', botToken }),
      });
      const json = await res.json();
      if (json.success && json.data.ok) {
        setVerifyResult(`Bot verified: @${json.data.botName}`);
      } else {
        setVerifyResult(`Error: ${json.data?.error || json.error}`);
      }
    } catch {
      setVerifyResult('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!botToken || !testChatId) { alert('Enter bot token and chat ID'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message', botToken, chatId: testChatId }),
      });
      const json = await res.json();
      alert(json.success ? 'Test message sent! Check Telegram.' : `Failed: ${json.data?.error || json.error}`);
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!botToken) { alert('Enter a bot token'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', botToken }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Settings saved!');
        fetchSettings();
        setBotToken('');
      } else {
        alert(json.error || 'Failed to save');
      }
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setSaving(true);
    try {
      const action = settings?.enabled ? 'disable' : 'save_settings';
      const body: any = { action };
      if (!settings?.enabled) {
        body.botToken = botToken || '__existing__';
      }
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) fetchSettings();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const notifColumns: ColumnDef<Notification>[] = [
    {
      header: 'Time',
      accessor: 'createdAt',
      render: (val) => val ? new Date(val).toLocaleString('en-US') : '-',
    },
    { header: 'Module', accessor: 'module' },
    { header: 'Event', accessor: 'event' },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => {
        const colors: Record<string, string> = {
          SENT: 'bg-green-100 text-green-800',
          FAILED: 'bg-red-100 text-red-800',
          PENDING: 'bg-yellow-100 text-yellow-800',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[val] || 'bg-gray-100 text-gray-800'}`}>{val}</span>;
      },
    },
    {
      header: 'Error',
      accessor: 'errorMsg',
      hideOnMobile: true,
      render: (val) => val ? <span className="text-red-600 text-xs">{val}</span> : '-',
    },
  ];

  const modules = ['SALES', 'PURCHASING', 'FINANCE', 'HR', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'SYSTEM', 'APPROVAL'];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Telegram Notifications</h1>
        <div className="flex gap-2">
          {settings && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              settings.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-1" />Settings
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'log' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1" />Notification Log
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Connection Status</h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  {settings?.configured ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {settings?.configured ? 'Bot configured' : 'Bot not configured'}
                    </p>
                    {settings?.maskedToken && (
                      <p className="text-xs text-gray-500">Token: {settings.maskedToken}</p>
                    )}
                  </div>
                </div>
                {settings?.configured && isAdmin && (
                  <Button variant={settings.enabled ? 'outline' : 'primary'} size="sm" onClick={handleToggle} disabled={saving}>
                    {settings.enabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Configure Bot - Admin only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Configure Telegram Bot</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-gray-700 space-y-2">
                  <p className="font-semibold text-gray-900">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open Telegram and search for <b>@BotFather</b></li>
                    <li>Send <code>/newbot</code> and follow the prompts to create a bot</li>
                    <li>Copy the bot token provided by BotFather</li>
                    <li>Paste the token below and click Verify</li>
                    <li>Each user can then add their Chat ID in their Profile page</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="e.g., 7123456789:AAH..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button variant="secondary" size="sm" onClick={handleVerifyToken} disabled={saving || !botToken}>
                      Verify
                    </Button>
                  </div>
                  {verifyResult && (
                    <p className={`text-xs mt-1 ${verifyResult.startsWith('Bot') ? 'text-green-600' : 'text-red-600'}`}>
                      {verifyResult}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Chat ID (optional)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Your chat ID for testing"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button variant="secondary" size="sm" onClick={handleTestMessage} disabled={saving || !botToken || !testChatId}>
                      Send Test
                    </Button>
                  </div>
                </div>

                <Button variant="primary" onClick={handleSaveSettings} disabled={saving || !botToken}>
                  {saving ? 'Saving...' : 'Save Bot Token'}
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Role-Module Mapping */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Role-Based Notification Routing</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Role</th>
                      {modules.map((m) => (
                        <th key={m} className="text-center py-2 px-1 font-semibold">{m.slice(0, 4)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries({
                      ADMIN: modules,
                      MANAGER: modules,
                      SALES: ['SALES', 'APPROVAL'],
                      PROCUREMENT: ['PURCHASING', 'APPROVAL'],
                      FINANCE: ['FINANCE', 'SALES', 'APPROVAL'],
                      HR: ['HR', 'APPROVAL'],
                      MEDICAL_PHARMACIST: ['MEDICAL', 'APPROVAL'],
                      WAREHOUSE: ['PURCHASING', 'CEMENT', 'AGGREGATE', 'APPROVAL'],
                    }).map(([role, mods]) => (
                      <tr key={role} className="border-b">
                        <td className="py-2 px-2 font-medium">{role}</td>
                        {modules.map((m) => (
                          <td key={m} className="text-center py-2 px-1">
                            {mods.includes(m) ? (
                              <span className="text-green-600">&#10003;</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Notification Log Tab */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={filterModule}
                  onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Modules</option>
                  {modules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Status</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => fetchNotifications()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>

          <Table<Notification>
            data={notifications}
            columns={notifColumns}
            isLoading={loading}
            pageSize={20}
            totalPages={totalPages}
            currentPage={page}
            onPageChange={setPage}
            emptyMessage="No notifications yet"
          />
        </div>
      )}
    </div>
  );
}
