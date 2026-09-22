'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Layers, FileText } from 'lucide-react';
import {
  getSourceModuleInfo,
  getSourceReferenceLinks,
  SourceReferenceLinkItem,
} from '@/lib/source-reference-helper';

interface SourceReferenceDisplayProps {
  sourceModule?: string | null;
  sourceId?: string | null;
  sourceRef?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component to render clickable source reference badges that navigate directly to the linked ERP entity.
 */
export function SourceReferenceBadgeList({
  sourceModule,
  sourceId,
  sourceRef,
  className = '',
  size = 'md',
}: SourceReferenceDisplayProps) {
  if (!sourceRef && !sourceId) {
    return <span className="text-slate-400 font-mono text-sm">—</span>;
  }

  const links = getSourceReferenceLinks(sourceModule, sourceId, sourceRef);

  if (links.length === 0) {
    return (
      <span className="text-slate-900 font-mono text-sm font-medium">
        {sourceRef || sourceId || '—'}
      </span>
    );
  }

  const badgeSizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {links.map((item, idx) => (
        <Link
          key={`${item.ref}-${idx}`}
          href={item.url}
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 shadow-xs transition-all hover:shadow-sm group ${badgeSizeClass}`}
          title={`Click to open ${item.label}`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700 shrink-0" />
          <span className="truncate max-w-[220px]">{item.ref}</span>
          <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600 shrink-0 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

/**
 * Component to render a clickable Source Module badge linking to the respective ERP module.
 */
export function SourceModuleBadge({
  sourceModule,
  className = '',
}: {
  sourceModule?: string | null;
  className?: string;
}) {
  if (!sourceModule) {
    return <span className="text-slate-400 text-sm">—</span>;
  }

  const modInfo = getSourceModuleInfo(sourceModule);

  if (!modInfo) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
        {sourceModule}
      </span>
    );
  }

  return (
    <Link
      href={modInfo.url}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all shadow-xs hover:shadow-sm group ${modInfo.badgeClass} ${className}`}
      title={`Go to ${modInfo.name}`}
    >
      <Layers className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 shrink-0" />
      <span>{sourceModule}</span>
      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
