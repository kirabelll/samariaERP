export interface User {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface Team {
  name: string;
  logo: React.ElementType;
  plan: string;
}

export interface BaseNavItem {
  title: string;
  badge?: string;
  icon?: React.ElementType;
}

export type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

export type NavItem = NavCollapsible | NavLink;

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface SidebarData {
  user: User;
  teams: Team[];
  navGroups: NavGroup[];
}
