'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavCollapsible, NavItem, NavLink, type NavGroup as NavGroupType } from './types';
import { cn } from '@/lib/utils';

export function NavGroup({ title, items }: NavGroupType) {
  const { state, isMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        {title}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${(item as any).url || 'parent'}`;

          if (!item.items) {
            return <SidebarMenuLink key={key} item={item as NavLink} pathname={pathname} />;
          }

          if (state === 'collapsed' && !isMobile) {
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item as NavCollapsible} pathname={pathname} />
            );
          }

          return <SidebarMenuCollapsible key={key} item={item as NavCollapsible} pathname={pathname} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

const NavBadge = ({ children }: { children: React.ReactNode }) => (
  <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px] ml-auto font-mono">
    {children}
  </Badge>
);

function checkIsActive(pathname: string, item: NavItem, mainNav = false) {
  if ('url' in item && item.url) {
    if (item.url === '/dashboard') return pathname === '/dashboard';
    return pathname === item.url || pathname.startsWith(`${item.url}/`);
  }
  if ('items' in item && item.items) {
    return item.items.some((sub) => pathname === sub.url || pathname.startsWith(`${sub.url}/`));
  }
  return false;
}

const SidebarMenuLink = ({ item, pathname }: { item: NavLink; pathname: string }) => {
  const { setOpenMobile } = useSidebar();
  const active = checkIsActive(pathname, item);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className={cn(
          active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold shadow-xs'
        )}
      >
        <Link href={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const SidebarMenuCollapsible = ({
  item,
  pathname,
}: {
  item: NavCollapsible;
  pathname: string;
}) => {
  const { setOpenMobile } = useSidebar();
  const active = checkIsActive(pathname, item);

  return (
    <Collapsible
      asChild
      defaultOpen={active}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={active}>
            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 h-3.5 w-3.5" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              const subActive = pathname === subItem.url || pathname.startsWith(`${subItem.url}/`);
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={subActive}
                    className={cn(
                      subActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    )}
                  >
                    <Link href={subItem.url} onClick={() => setOpenMobile(false)}>
                      {subItem.icon && <subItem.icon className="h-3.5 w-3.5 shrink-0" />}
                      <span>{subItem.title}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const SidebarMenuCollapsedDropdown = ({
  item,
  pathname,
}: {
  item: NavCollapsible;
  pathname: string;
}) => {
  const active = checkIsActive(pathname, item);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={active}
          >
            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 h-3.5 w-3.5" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4} className="min-w-48">
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => {
            const subActive = pathname === sub.url || pathname.startsWith(`${sub.url}/`);
            return (
              <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                <Link
                  href={sub.url}
                  className={cn(subActive && 'bg-accent text-accent-foreground font-medium')}
                >
                  {sub.icon && <sub.icon className="h-4 w-4 shrink-0 mr-2" />}
                  <span className="truncate">{sub.title}</span>
                  {sub.badge && (
                    <span className="ml-auto text-xs font-mono opacity-70">{sub.badge}</span>
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};
