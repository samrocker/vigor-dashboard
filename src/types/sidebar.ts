// types/sidebar.ts
import { User } from "./schemas/user";

export interface NavigationItem {
  name: string;
  icon: JSX.Element;
  path: string;
  roles?: User['role'][]; // Optional roles that can see this item
}

export interface SidebarProps {
  toggleSidebar: () => void;
  isMobile?: boolean;
}