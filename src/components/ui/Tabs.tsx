'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// -------------------------------------------------------------
// Shadcn Context & Primitives
// -------------------------------------------------------------

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsRootProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  tabs?: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'card' | 'pills';
}

export function TabsRoot({
  value: propValue,
  defaultValue,
  onValueChange,
  className,
  children,
  tabs,
  defaultTabId,
  onChange,
  variant,
  ...props
}: TabsRootProps) {
  // Support for legacy array format
  if (tabs && tabs.length > 0) {
    return (
      <LegacyTabsWrapper
        tabs={tabs}
        defaultTabId={defaultTabId}
        onChange={onChange}
        variant={variant}
        className={className}
      />
    );
  }

  const [stateValue, setStateValue] = React.useState(defaultValue || '');
  const activeValue = propValue !== undefined ? propValue : stateValue;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (propValue === undefined) {
        setStateValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [propValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-fit gap-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  disabled,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        isActive
          ? 'bg-background text-foreground shadow-xs font-semibold'
          : 'hover:text-foreground text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// -------------------------------------------------------------
// Legacy Tabs Component wrapper for ERP backward compatibility
// -------------------------------------------------------------

function LegacyTabsWrapper({
  tabs,
  defaultTabId,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode; disabled?: boolean }>;
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: string;
  className?: string;
}) {
  const [activeTabId, setActiveTabId] = React.useState(defaultTabId || tabs[0]?.id || '');

  const handleTabChange = (id: string) => {
    setActiveTabId(id);
    onChange?.(id);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-fit gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer',
                isActive
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'hover:text-foreground text-muted-foreground',
                tab.disabled && 'opacity-50 pointer-events-none'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab && <div className="mt-2">{activeTab.content}</div>}
    </div>
  );
}

export { TabsRoot as Tabs };
export default TabsRoot;
