'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Check, Save, RotateCcw, AlertCircle } from 'lucide-react';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'PROCUREMENT' | 'FINANCE' | 'HR' | 'WAREHOUSE' | 'MEDICAL_PHARMACIST' | 'MEDICAL_DRUGGIST';

// Default role-based permissions configuration
const defaultRolePermissions: Record<UserRole, string[]> = {
  ADMIN: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  MANAGER: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  SALES: ['MAIN', 'MASTER DATA', 'COMMERCIAL', 'REPORTS'],
  PROCUREMENT: ['MAIN', 'MASTER DATA', 'PURCHASING', 'REPORTS'],
  FINANCE: ['MAIN', 'MASTER DATA', 'FINANCE', 'REPORTS'],
  HR: ['MAIN', 'MASTER DATA', 'HR & PAYROLL', 'REPORTS'],
  WAREHOUSE: ['MAIN', 'MASTER DATA', 'CONSTRUCTION'],
  MEDICAL_PHARMACIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
  MEDICAL_DRUGGIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
};

const roles: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'SALES',
  'PROCUREMENT',
  'FINANCE',
  'HR',
  'WAREHOUSE',
  'MEDICAL_PHARMACIST',
  'MEDICAL_DRUGGIST',
];

const modules = [
  'MAIN',
  'MASTER DATA',
  'CONSTRUCTION',
  'MEDICAL',
  'COMMERCIAL',
  'PURCHASING',
  'FINANCE',
  'HR & PAYROLL',
  'REPORTS',
  'SYSTEM',
];

const moduleDescriptions: Record<string, string> = {
  'MAIN': 'Dashboard access',
  'MASTER DATA': 'Customers, Suppliers, Factories, Items, Employees',
  'CONSTRUCTION': 'Aggregate & Cement Operations',
  'MEDICAL': 'Licensed Customers, Requests, Store, Pricing, Commission',
  'COMMERCIAL': 'Sales Agreements, Orders, Invoices, Deliveries, Payments',
  'PURCHASING': 'Purchase Orders, Goods Receiving',
  'FINANCE': 'Chart of Accounts, Journal, Banking, VAT, Cashbook',
  'HR & PAYROLL': 'Attendance, Leave, Payroll, Tax, Advances',
  'REPORTS': 'Sales, Purchase, Financial, Stock, HR Reports',
  'SYSTEM': 'Approvals, Activity Log, Documents, Settings',
};

export default function RoleBasedAccessControlPage() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<Record<UserRole, string[]>>(defaultRolePermissions);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load permissions from database on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch('/api/system/role-permissions');
        const json = await res.json();
        if (json.success && json.data) {
          setPermissions(json.data);
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };
    loadPermissions();
  }, []);

  // Check if user is ADMIN
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  // If not admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Role & Permission Settings</h1>
            <p className="text-slate-500 mt-1">Manage role-based access control for all system modules</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Access Denied</h3>
            <p className="text-red-700 text-sm mt-1">
              Only ADMIN users can access and modify role permissions. Please contact your system administrator if you need to make changes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleTogglePermission = (role: UserRole, module: string) => {
    // Don't allow editing ADMIN and MANAGER rows
    if (role === 'ADMIN' || role === 'MANAGER') {
      return;
    }

    setPermissions((prev) => {
      const updatedPermissions = { ...prev };
      const moduleList = [...updatedPermissions[role]];
      const index = moduleList.indexOf(module);

      if (index > -1) {
        moduleList.splice(index, 1);
      } else {
        moduleList.push(module);
      }

      updatedPermissions[role] = moduleList;
      return updatedPermissions;
    });

    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const res = await fetch('/api/system/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMessage('Permissions saved successfully!');
        setShowSuccessMessage(true);
        setHasChanges(false);
      } else {
        setSuccessMessage(json.error || 'Failed to save permissions.');
        setShowSuccessMessage(true);
      }

      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setSuccessMessage('Failed to save permissions. Please try again.');
      setShowSuccessMessage(true);
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all permissions to defaults? This cannot be undone.')) {
      setPermissions(defaultRolePermissions);
      try {
        await fetch('/api/system/role-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: defaultRolePermissions }),
        });
      } catch (e) {
        // ignore
      }
      setSuccessMessage('Permissions reset to defaults.');
      setShowSuccessMessage(true);
      setHasChanges(false);

      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    }
  };

  const hasAccess = (role: UserRole, module: string) => {
    return permissions[role].includes(module);
  };

  const isRowLocked = (role: UserRole) => {
    return role === 'ADMIN' || role === 'MANAGER';
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role & Permission Settings</h1>
          <p className="text-slate-500 mt-1">Manage role-based access control for all system modules. ADMIN and MANAGER roles are locked with full access.</p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-in fade-in">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSaveChanges}
          disabled={!hasChanges}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
        <button
          onClick={handleResetToDefaults}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 sticky left-0 bg-slate-50 z-10">
                  Role
                </th>
                {modules.map((module) => (
                  <th
                    key={module}
                    className="px-4 py-4 text-center text-sm font-semibold text-slate-900 min-w-[140px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                        {module}
                      </span>
                      <span className="text-xs text-slate-500 font-normal normal-case">
                        {moduleDescriptions[module]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role, rowIndex) => {
                const locked = isRowLocked(role);
                return (
                  <tr
                    key={role}
                    className={`border-b border-slate-200 ${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    } ${!locked && 'hover:bg-blue-50'} transition-colors ${locked && 'bg-slate-100'}`}
                  >
                    <td className={`px-6 py-4 sticky left-0 z-10 ${locked ? 'bg-slate-100' : (rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50')}`}>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-900">
                          {role.replace(/_/g, ' ')}
                        </span>
                        {locked && (
                          <span className="text-xs text-amber-700 font-medium">
                            (Locked - Full Access)
                          </span>
                        )}
                      </div>
                    </td>
                    {modules.map((module) => (
                      <td
                        key={`${role}-${module}`}
                        className="px-4 py-4 text-center"
                      >
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTogglePermission(role, module)}
                            disabled={locked}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                              locked
                                ? 'cursor-not-allowed bg-slate-300'
                                : hasAccess(role, module)
                                ? 'bg-green-100 hover:bg-green-200 cursor-pointer'
                                : 'bg-slate-200 hover:bg-slate-300 cursor-pointer'
                            }`}
                            title={locked ? `${role} access is locked` : `Click to toggle access`}
                          >
                            {hasAccess(role, module) && (
                              <Check className={`w-4 h-4 ${locked ? 'text-slate-600' : 'text-green-700'}`} />
                            )}
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Legend & Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Access Granted</p>
              <p className="text-xs text-slate-500">Role has access to this module</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0 mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Access Denied</p>
              <p className="text-xs text-slate-500">Role does not have access to this module</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-300 flex-shrink-0 mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Locked</p>
              <p className="text-xs text-slate-500">ADMIN and MANAGER access is locked with full permissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Role Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">ADMIN</h4>
            <p className="text-sm text-slate-600">
              Full system access. Can view and manage all modules and settings. Access is locked.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">MANAGER</h4>
            <p className="text-sm text-slate-600">
              Full system access equivalent to ADMIN for operational oversight. Access is locked.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">SALES</h4>
            <p className="text-sm text-slate-600">
              Access to customer data, commercial operations, and sales reports.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">PROCUREMENT</h4>
            <p className="text-sm text-slate-600">
              Access to suppliers, purchase orders, and procurement reports.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">FINANCE</h4>
            <p className="text-sm text-slate-600">
              Access to accounting, banking, and financial reports.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">HR</h4>
            <p className="text-sm text-slate-600">
              Access to employee management, payroll, and HR reports.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">WAREHOUSE</h4>
            <p className="text-sm text-slate-600">
              Access to construction operations (Aggregate & Cement).
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">MEDICAL_PHARMACIST</h4>
            <p className="text-sm text-slate-600">
              Full access to medical operations, pricing, and commission management.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2">MEDICAL_DRUGGIST</h4>
            <p className="text-sm text-slate-600">
              Limited access to medical operations and inventory management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
