'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  RotateCcw,
  List,
  GitFork,
  Building2,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmDialog } from '@/components/ui/Modal';

interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | string;
  parentId: string | null;
  isActive: boolean;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
  signedBalance: number;
  transactionCount: number;
  isGroup: boolean;
  children?: AccountNode[];
}

export default function ChartOfAccountsPage() {
  const router = useRouter();

  // Data state
  const [treeData, setTreeData] = useState<AccountNode[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountNode[]>([]);
  const [companyName, setCompanyName] = useState<string>('Samaria Trading PLC');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View & Filter state
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['ROOT']));
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);

  // Seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountNode | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountNode | null>(null);

  // Form state for add / edit
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'Asset',
    parentId: '',
    isActive: true,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/finance/accounts?limit=1000');
      const result = await res.json();

      if (result.success) {
        setCompanyName(result.companyName || 'Samaria Trading PLC');
        setTreeData(result.tree || []);
        setAllAccounts(result.allAccounts || result.data || []);

        // Expand root and first level nodes by default
        const initialExpanded = new Set<string>(['ROOT']);
        if (result.tree && Array.isArray(result.tree)) {
          for (const node of result.tree) {
            initialExpanded.add(node.id);
            if (node.children && node.children.length > 0) {
              for (const child of node.children) {
                if (child.isGroup) {
                  initialExpanded.add(child.id);
                }
              }
            }
          }
        }
        setExpandedNodes(initialExpanded);
      } else {
        setError(result.error || 'Failed to load accounts');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  // Seed standard accounts
  const handleSeedAccounts = async () => {
    if (!confirm('This will seed the standard Chart of Accounts structure. Existing accounts will not be duplicated. Continue?')) {
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/finance/accounts', { method: 'PUT' });
      const result = await res.json();
      if (result.success) {
        setSeedResult(`Successfully configured ${result.accounts?.length || 0} standard accounts`);
        await fetchAccounts();
      } else {
        setSeedResult(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setSeedResult(`Error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  // Toggle node expansion
  const toggleExpand = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Expand all nodes
  const handleExpandAll = () => {
    const allIds = new Set<string>(['ROOT']);
    for (const a of allAccounts) {
      allIds.add(a.id);
    }
    setExpandedNodes(allIds);
  };

  // Collapse all nodes
  const handleCollapseAll = () => {
    setExpandedNodes(new Set(['ROOT']));
  };

  // Open Add Modal
  const openAddChildModal = (parent?: AccountNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormError(null);
    setFormData({
      accountCode: parent ? `${parent.accountCode.slice(0, 3)}` : '',
      accountName: '',
      accountType: parent ? parent.accountType : 'Asset',
      parentId: parent ? parent.id : '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (account: AccountNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormError(null);
    setAccountToEdit(account);
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      parentId: account.parentId || '',
      isActive: account.isActive,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (account: AccountNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAccountToDelete(account);
    setIsDeleteConfirmOpen(true);
  };

  // Save New Account
  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: formData.accountCode.trim(),
          accountName: formData.accountName.trim(),
          accountType: formData.accountType,
          parentId: formData.parentId || null,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        await fetchAccounts();
        if (formData.parentId) {
          setExpandedNodes((prev) => {
            const next = new Set(prev);
            next.add(formData.parentId);
            return next;
          });
        }
      } else {
        setFormError(data.error || 'Failed to create account');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormSaving(false);
    }
  };

  // Save Edited Account
  const handleSaveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountToEdit) return;
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/finance/accounts/${accountToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: formData.accountCode.trim(),
          accountName: formData.accountName.trim(),
          accountType: formData.accountType,
          parentId: formData.parentId || null,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setAccountToEdit(null);
        await fetchAccounts();
      } else {
        setFormError(data.error || 'Failed to update account');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      const res = await fetch(`/api/finance/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setIsDeleteConfirmOpen(false);
        setAccountToDelete(null);
        await fetchAccounts();
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting');
    }
  };

  // Format currency balance with Dr / Cr (like Br 0.00 Cr in Frappe)
  const formatBalance = (amount: number, balanceType: 'Dr' | 'Cr') => {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Br ${formatted} ${balanceType}`;
  };

  // Matching filter check for search and type
  const isNodeMatching = (node: AccountNode): boolean => {
    const matchesSearch =
      !searchTerm ||
      node.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.accountName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !typeFilter || node.accountType === typeFilter;

    return matchesSearch && matchesType;
  };

  // Check if node or any of its descendants match
  const nodeOrDescendantMatches = (node: AccountNode): boolean => {
    if (isNodeMatching(node)) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some(nodeOrDescendantMatches);
    }
    return false;
  };

  // Auto-expand nodes when searching
  useEffect(() => {
    if (searchTerm || typeFilter) {
      const matchingParentIds = new Set<string>(['ROOT']);
      const findMatches = (node: AccountNode, parentIds: string[]) => {
        const isMatch = isNodeMatching(node);
        if (isMatch) {
          parentIds.forEach((id) => matchingParentIds.add(id));
        }
        if (node.children) {
          for (const child of node.children) {
            findMatches(child, [...parentIds, node.id]);
          }
        }
      };

      for (const root of treeData) {
        findMatches(root, ['ROOT']);
      }
      setExpandedNodes(matchingParentIds);
    }
  }, [searchTerm, typeFilter, treeData]);

  // List of potential parent accounts for dropdown (groups or all)
  const parentOptions = useMemo(() => {
    return allAccounts
      .filter((a) => !accountToEdit || a.id !== accountToEdit.id)
      .map((a) => ({
        value: a.id,
        label: `${a.accountCode} - ${a.accountName} (${a.accountType})`,
      }));
  }, [allAccounts, accountToEdit]);

  // Render a Single Account Tree Node recursively
  const renderTreeNode = (node: AccountNode, depth: number = 0) => {
    if (!nodeOrDescendantMatches(node)) return null;

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isGroup = node.isGroup || hasChildren;
    const isSelected = selectedAccountId === node.id;
    const isHovered = hoveredAccountId === node.id;
    const isHighlighted = (searchTerm || typeFilter) && isNodeMatching(node);

    return (
      <div key={node.id} className="select-none">
        {/* Node Row */}
        <div
          className={`group relative flex items-center justify-between py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-sm ${
            isSelected
              ? 'bg-blue-50/90 text-blue-950 font-medium'
              : isHovered
              ? 'bg-gray-100/80 text-gray-900'
              : 'hover:bg-gray-50/80 text-gray-800'
          } ${isHighlighted ? 'bg-amber-50/80' : ''}`}
          style={{ paddingLeft: `${Math.max(12, depth * 24 + 12)}px` }}
          onClick={() => setSelectedAccountId(node.id === selectedAccountId ? null : node.id)}
          onMouseEnter={() => setHoveredAccountId(node.id)}
          onMouseLeave={() => setHoveredAccountId(null)}
        >
          {/* Left: Icon, Code, Name, Actions */}
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
            {/* Expand / Collapse Icon for Groups, or Bullet Icon for Leaf Accounts */}
            {isGroup ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 rounded transition-transform"
              >
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-600 fill-amber-100" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-600 fill-amber-100" />
                )}
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full border border-gray-400 bg-white inline-block"></span>
              </span>
            )}

            {/* Account Label: Code - Name */}
            <span
              className={`truncate ${
                isGroup ? 'font-medium text-gray-900' : 'text-gray-700'
              } ${!node.isActive ? 'line-through opacity-60' : ''}`}
            >
              <span className="font-mono text-gray-600 text-xs font-semibold mr-1.5">{node.accountCode}</span>
              <span>- {node.accountName}</span>
            </span>

            {/* Inline Action Buttons (Like Frappe screenshot: [Edit] [Delete] [Add Child] [View Ledger]) */}
            <div
              className={`flex items-center gap-1 ml-2 transition-opacity ${
                isSelected || isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => openEditModal(node, e)}
                className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs transition-colors"
                title="Edit Account"
              >
                Edit
              </button>
              <button
                onClick={(e) => openDeleteDialog(node, e)}
                className="px-2 py-0.5 text-xs bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 rounded shadow-2xs transition-colors"
                title="Delete Account"
              >
                Delete
              </button>
              <button
                onClick={(e) => openAddChildModal(node, e)}
                className="px-2 py-0.5 text-xs bg-white hover:bg-blue-50 text-blue-600 border border-gray-200 hover:border-blue-200 rounded shadow-2xs transition-colors font-medium"
                title="Add Child Account under this"
              >
                Add Child
              </button>
              <Link
                href={`/dashboard/finance/general-ledger?accountId=${node.id}&accountCode=${encodeURIComponent(node.accountCode)}`}
                className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs transition-colors inline-flex items-center gap-1"
                title="View General Ledger"
              >
                View Ledger
              </Link>
            </div>
          </div>

          {/* Right: Amount based on transactions with Dr / Cr indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`font-mono text-xs sm:text-sm font-medium ${
                node.balance > 0
                  ? node.balanceType === 'Dr'
                    ? 'text-gray-900'
                    : 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              {formatBalance(node.balance, node.balanceType)}
            </span>
          </div>
        </div>

        {/* Children Sub-Tree */}
        {isGroup && isExpanded && node.children && node.children.length > 0 && (
          <div className="relative">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GitFork className="w-6 h-6 text-blue-600 rotate-90" />
            Chart of Accounts
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Hierarchical chart of accounts with real-time transaction balances & rollups
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSeedAccounts}
            isLoading={seeding}
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          >
            Seed Standard Accounts
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddChildModal()}
            icon={<Plus className="w-4 h-4" />}
          >
            + Add Account
          </Button>
        </div>
      </div>

      {/* Seed notification */}
      {seedResult && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between ${
            seedResult.startsWith('Error')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          <span>{seedResult}</span>
          <button
            onClick={() => setSeedResult(null)}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Tree Controls Bar */}
      <Card className="p-4 bg-white shadow-xs border border-gray-200">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Search and Type Filter */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search account code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-3 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue / Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>

          {/* Tree Actions & View Mode Switcher */}
          <div className="flex items-center gap-2">
            {viewMode === 'tree' && (
              <>
                <Button size="sm" variant="outline" onClick={handleExpandAll}>
                  Expand All
                </Button>
                <Button size="sm" variant="outline" onClick={handleCollapseAll}>
                  Collapse All
                </Button>
              </>
            )}

            <div className="border-l border-gray-200 pl-2 ml-1 flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'tree'
                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GitFork className="w-3.5 h-3.5 rotate-90" />
                Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Tree Card */}
      <Card className="bg-white shadow-xs border border-gray-200 overflow-hidden">
        {loading && allAccounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm">Loading Chart of Accounts...</p>
          </div>
        ) : error && allAccounts.length === 0 ? (
          <div className="p-12 text-center text-red-600">
            <p>Error: {error}</p>
            <Button variant="outline" size="sm" onClick={fetchAccounts} className="mt-3">
              Retry
            </Button>
          </div>
        ) : viewMode === 'tree' ? (
          /* ============================================================ */
          /* FRAPPE-STYLE TREE VIEW                                       */
          /* ============================================================ */
          <div className="p-4 sm:p-6 font-sans">
            {allAccounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No chart of accounts defined yet.</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Click below to generate the standard Ethiopian Chart of Accounts structure automatically.
                </p>
                <Button variant="primary" size="sm" onClick={handleSeedAccounts} isLoading={seeding}>
                  Seed Standard Chart of Accounts
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Root Organization / Company Node */}
                <div
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer font-bold text-gray-900 text-sm sm:text-base border-b border-gray-100 mb-2"
                  onClick={() => toggleExpand('ROOT')}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleExpand('ROOT', e)}
                      className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900"
                    >
                      {expandedNodes.has('ROOT') ? (
                        <FolderOpen className="w-5 h-5 text-amber-600 fill-amber-100" />
                      ) : (
                        <Folder className="w-5 h-5 text-amber-600 fill-amber-100" />
                      )}
                    </button>
                    <span>{companyName}</span>
                    <Badge status="Approved" className="ml-1 text-[10px]">
                      Root
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => openAddChildModal(undefined, e)}
                      className="px-2 py-0.5 text-xs bg-white hover:bg-blue-50 text-blue-600 border border-gray-200 rounded font-normal"
                    >
                      + Add Group
                    </button>
                  </div>
                </div>

                {/* Tree Nodes under Root */}
                {expandedNodes.has('ROOT') && (
                  <div className="space-y-0.5 pl-2 sm:pl-4 border-l border-gray-100">
                    {treeData.map((node) => renderTreeNode(node, 0))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* FLAT LIST VIEW (FALLBACK)                                    */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Account Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Debit</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Credit</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Balance</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allAccounts.filter(isNodeMatching).map((account) => (
                  <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono font-medium text-gray-900">{account.accountCode}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{account.accountName}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {account.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      ETB {account.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      ETB {account.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatBalance(account.balance, account.balanceType)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge status={account.isActive ? 'Active' : 'Inactive'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(account)}
                          className="p-1 text-gray-500 hover:text-blue-600 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/dashboard/finance/general-ledger?accountId=${account.id}&accountCode=${encodeURIComponent(account.accountCode)}`}
                          className="p-1 text-gray-500 hover:text-gray-900 rounded"
                          title="View Ledger"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* MODAL: ADD ACCOUNT                                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={formData.parentId ? 'Add Child Account' : 'Add New Account'}
        description="Create a new account in the Chart of Accounts"
      >
        <form onSubmit={handleSaveNewAccount} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Code"
              required
              placeholder="e.g. 1010"
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Account Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue / Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
          </div>

          <Input
            label="Account Name"
            required
            placeholder="e.g. Cash on Hand"
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Parent Account (Optional)
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (Top-Level Account)</option>
              {parentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="new-account-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="new-account-active" className="text-sm font-medium text-gray-700 cursor-pointer">
              Account is Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={formSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: EDIT ACCOUNT                                          */}
      {/* ============================================================ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setAccountToEdit(null);
        }}
        title={`Edit Account: ${accountToEdit?.accountCode || ''}`}
        description="Update account details and classification"
      >
        <form onSubmit={handleSaveEditAccount} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Code"
              required
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Account Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue / Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
          </div>

          <Input
            label="Account Name"
            required
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Parent Account
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (Top-Level Account)</option>
              {parentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="edit-account-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="edit-account-active" className="text-sm font-medium text-gray-700 cursor-pointer">
              Account is Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setAccountToEdit(null);
              }}
              disabled={formSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* CONFIRM DELETE DIALOG                                        */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setAccountToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message={`Are you sure you want to delete ${accountToDelete?.accountCode} - ${accountToDelete?.accountName}? This action cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        isDangerous
      />
    </div>
  );
}
