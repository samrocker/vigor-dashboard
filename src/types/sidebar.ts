export interface NavigationItem {
  name: string;
  icon: JSX.Element;
  path?: string;
  children?: NavigationItem[];
}

export interface SidebarProps {
  toggleSidebar: () => void;
  isMobileOpen?: boolean;
  isMobile?: boolean;
}

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
} 