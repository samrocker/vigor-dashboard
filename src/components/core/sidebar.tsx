"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutGrid,
  Users,
  Tag,
  Tags,
  Package,
  ShoppingCart,
  Image as ImageIcon,
  FileText,
  GitBranch,
  Settings,
  ShieldHalf,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import axiosInstance from "@/lib/axios";
import { deleteTokens } from "@/lib/auth";
import { User } from "@/types/schemas/user";
import { NavigationItem } from "@/types/sidebar";
import logo from "../../../public/images/logo.png";

// --- CUSTOM HOOK TO PREVENT HYDRATION ERRORS ---
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
};

// --- NAVIGATION DATA ---
const navigationItems: NavigationItem[] = [
  { name: "User", path: "/users", icon: <Users size={20} /> },
  {
    name: "Admin",
    path: "/admin",
    icon: <ShieldHalf size={20} />,
    roles: ["SUPER"],
  },
  { name: "Categories", path: "/category", icon: <Tag size={20} /> },
  { name: "Subcategories", path: "/subcategory", icon: <Tags size={20} /> },
  { name: "Orders", path: "/order", icon: <Package size={20} /> },
  {
    name: "Images",
    path: "/image",
    icon: <ImageIcon size={20} />,
    roles: ["SUPER"],
  },
  { name: "Products", path: "/product", icon: <Package size={20} /> },
  { name: "Variants", path: "/variant", icon: <GitBranch size={20} /> },
  { name: "Carts", path: "/cart", icon: <ShoppingCart size={20} /> },
  { name: "Blogs", path: "/blog", icon: <FileText size={20} /> },
  {
    name: "Settings",
    path: "/setting",
    icon: <Settings size={20} />,
    roles: ["SUPER"],
  },
];

// --- USER DETAILS COMPONENT ---
interface UserDetailsProps {
  user: User | null;
  isLoading: boolean;
}

const UserDetails = ({ user, isLoading }: UserDetailsProps) => {
  const router = useRouter();
  const handleLogout = () => {
    deleteTokens();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4 border-t pt-4 mt-auto">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-t pt-4 mt-auto">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {user.name ? user.name[0].toUpperCase() : "U"}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm truncate block">
            {user.name}
          </span>
          <span className="text-xs text-muted-foreground truncate block">
            {user.email}
          </span>
          <Badge
            variant={user.role === "SUPER" ? "default" : "secondary"}
            className="mt-1"
          >
            {user.role} ADMIN
          </Badge>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};

// --- EXPANDED SIDEBAR COMPONENT ---
interface MainSidebarProps {
  toggleSidebar: () => void;
  isMobile: boolean;
  user: User | null;
  isLoadingUser: boolean;
}

const MainSidebar = ({
  toggleSidebar,
  isMobile,
  user,
  isLoadingUser,
}: MainSidebarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      toggleSidebar();
    }
  };

  const filteredNavItems = navigationItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div
      className={`
      ${
        isMobile
          ? "fixed inset-y-0 left-0 w-full max-w-xs z-50 transform transition-transform duration-300 translate-x-0"
          : "relative w-72 flex-shrink-0"
      }
      bg-background border-r flex flex-col h-screen
    `}
    >
      <div className="flex flex-col h-full overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src={logo}
              alt="Vigor Bikes Logo"
              width={120}
              height={30}
              className="dark:invert"
              priority
            />
          </Link>
          <div className="flex items-center space-x-1">
            <ThemeToggle
              isDark={resolvedTheme === "dark"}
              onToggle={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              size="iconOnly"
            />
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-muted"
            >
              {isMobile ? <X size={20} /> : <ChevronsLeft size={20} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {isLoadingUser
            ? Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))
            : filteredNavItems.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors duration-200
                  ${
                    pathname === item.path
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  {item.icon}
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
              ))}
        </nav>

        <UserDetails user={user} isLoading={isLoadingUser} />
      </div>
    </div>
  );
};

// --- COLLAPSED SIDEBAR COMPONENT ---
interface MiniSidebarProps {
  toggleSidebar: () => void;
  user: User | null;
  isLoadingUser: boolean;
}

const MiniSidebar = ({
  toggleSidebar,
  user,
  isLoadingUser,
}: MiniSidebarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const handleLogout = () => {
    deleteTokens();
    router.push("/login");
  };

  const filteredNavItems = navigationItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="hidden sm:flex flex-col items-center py-5 px-3 bg-background border-r flex-shrink-0 w-20 h-screen">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-muted mb-4"
      >
        <Menu size={20} />
      </button>
      <ThemeToggle
        isDark={resolvedTheme === "dark"}
        onToggle={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        size="iconOnly"
      />

      <nav className="flex flex-col items-center space-y-4 flex-grow mt-8">
        {isLoadingUser
          ? Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-10 rounded-lg" />
            ))
          : filteredNavItems.map((item) => (
              <Link href={item.path} key={item.name} className="relative group">
                <div
                  className={`p-3 rounded-lg cursor-pointer
                    ${
                      pathname === item.path
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {item.icon}
                </div>
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  {item.name}
                </span>
              </Link>
            ))}
      </nav>

      <div className="mt-auto">
        {isLoadingUser ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold hover:ring-2 hover:ring-primary/50">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="center" className="w-56">
              <div className="p-2">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/login")}
          >
            <LogOut size={20} />
          </Button>
        )}
      </div>
    </div>
  );
};

// --- SKELETON COMPONENT FOR INITIAL RENDER ---
const SidebarSkeleton = () => {
  return (
    <div className="relative w-72 flex-shrink-0 bg-background border-r flex-col h-screen p-5 hidden sm:flex">
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center space-x-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex items-center space-x-4 border-t pt-4 mt-auto">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
};

// --- MAIN EXPORTED COMPONENT ---
const Sidebar = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const isClient = useIsClient(); // Use the custom hook

  useEffect(() => {
    const handleResize = () => {
      const currentIsMobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(currentIsMobile);
      if (currentIsMobile) {
        setIsSidebarExpanded(false);
      } else {
        setIsSidebarExpanded(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await axiosInstance.get(
          "/admin/me?includeRelations=true"
        );
        if (response.data.status === "success") {
          setUser(response.data.data.admin);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
        console.error("Failed to fetch user:", err);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setIsSidebarExpanded(!isSidebarExpanded);

  // **** FIX: RENDER SKELETON ON SERVER AND INITIAL CLIENT RENDER ****
  if (!isClient) {
    return <SidebarSkeleton />;
  }

  if (isMobile) {
    return (
      <>
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-background/50 backdrop-blur-sm sm:hidden"
        >
          <Menu size={24} />
        </button>
        {isSidebarExpanded && (
          <MainSidebar
            toggleSidebar={toggleSidebar}
            isMobile={true}
            user={user}
            isLoadingUser={isLoadingUser}
          />
        )}
        {isSidebarExpanded && (
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={toggleSidebar}
          ></div>
        )}
      </>
    );
  }

  return isSidebarExpanded ? (
    <MainSidebar
      toggleSidebar={toggleSidebar}
      isMobile={false}
      user={user}
      isLoadingUser={isLoadingUser}
    />
  ) : (
    <MiniSidebar
      toggleSidebar={toggleSidebar}
      user={user}
      isLoadingUser={isLoadingUser}
    />
  );
};

export default Sidebar;
