'use client';

import React, { ReactNode, useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'card' | 'pills';
}

function Tabs({
  tabs,
  defaultTabId,
  onChange,
  variant = 'default',
}: TabsProps) {
  const [activeTabId, setActiveTabId] = useState(
    defaultTabId || tabs[0]?.id || ''
  );

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    onChange?.(tabId);
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const tabButtonBaseStyles =
    'px-4 py-2 font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantTabStyles = {
    default: {
      container: 'border-b border-[#E8E8ED]',
      tabButton: (isActive: boolean) =>
        isActive
          ? 'text-[#007AFF] border-b-2 border-[#007AFF] -mb-px'
          : 'text-[#86868B] hover:text-[#1D1D1F]',
      tabsList: 'flex gap-1',
    },
    card: {
      container: 'gap-4',
      tabButton: (isActive: boolean) =>
        isActive
          ? 'bg-white text-[#1D1D1F] border border-[#D2D2D7] shadow-sm'
          : 'bg-[#F5F5F7] text-[#86868B] border border-transparent hover:bg-[#EBEBF0]',
      tabsList: 'flex gap-2 p-1 bg-[#F5F5F7] rounded-xl',
    },
    pills: {
      container: 'gap-2',
      tabButton: (isActive: boolean) =>
        isActive
          ? 'bg-[#007AFF] text-white'
          : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#EBEBF0]',
      tabsList: 'flex gap-2',
    },
  };

  const variantConfig = variantTabStyles[variant];

  return (
    <div className={`flex flex-col ${variantConfig.container}`}>
      <div
        role="tablist"
        className={variantConfig.tabsList}
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={`${tabButtonBaseStyles} ${variantConfig.tabButton(
                isActive
              )} ${variant === 'card' ? 'rounded-lg' : ''} ${
                variant === 'pills' ? 'rounded-full' : ''
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTabId}`}
          aria-labelledby={`tab-${activeTabId}`}
          className="mt-4"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}

Tabs.displayName = 'Tabs';

export default Tabs;
