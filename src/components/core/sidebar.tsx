// Sidebar.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { navigationItems, appItems } from "@/constants/navigation"; // Assuming these are defined elsewhere
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarProps } from "@/types/sidebar";
import Image from "next/image";
import logo from "../../../public/images/logo.png";
import UserDetails from "./UserDetails";
import { User } from "@/types/schemas/user";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component

// Icons for clarity (you might already have these globally or in a separate icon file)
const XIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-x"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const MenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-panel-left"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="9" x2="9" y1="3" y2="21" />
  </svg>
);

const CollapseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-chevrons-left"
  >
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </svg>
);

// Main Sidebar Component (Expanded)
const MainSidebar = ({
  toggleSidebar,
  isMobile, // Renamed from isMobileOpen for clarity, reflects if the view is mobile
}: SidebarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname(); // Get current pathname
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // New loading state for user data
  const [isClient, setIsClient] = useState(false); // New state to track if client-side mounted

  // After mounting, we have access to the theme
  React.useEffect(() => {
    setMounted(true);
    setIsClient(true); // Set client mounted after initial render
  }, []);

  const handleNavigation = (item: string, path?: string) => {
    if (path) {
      router.push(path);
    }
    // If on mobile, close the sidebar after navigation
    if (isMobile) {
      toggleSidebar();
    }
  };

  const handleUserFetched = (user: User | null) => {
    if (user) {
      setUserRole(user.role);
    } else {
      setUserRole(null);
    }
    setIsLoadingUser(false); // User data has been fetched (or failed to fetch)
  };

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <div
      className={`
        ${
          isMobile
            ? "fixed inset-y-0 left-0 w-full max-w-sm z-50 transform transition-transform duration-300 translate-x-0"
            : "relative w-80 flex-shrink-0 transition-all duration-300 h-screen top-0"
        }
        bg-background border-r flex flex-col font-inter
      `}
    >
      {/* Scrollable container for sidebar content */}
      <div className="flex flex-col h-full overflow-y-auto p-5">
        {/* Top Bar - Fixed */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-2">
            <Image
              src={logo}
              alt="Vigor Bikes Logo"
              width={1920}
              height={1080}
              className="w-36 h-auto dark:invert"
            />
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="p-2 rounded-lg hover:bg-primary hover:text-primary-foreground cursor-pointer"
              onClick={toggleSidebar}
            >
              {isMobile ? <XIcon /> : <CollapseIcon />}
            </div>
            <ThemeToggle
              isDark={resolvedTheme === "dark"}
              onToggle={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              size="iconOnly"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-8 mb-6">
          {/* Navigation */}
          <div>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              NAVIGATION
            </h3>
            <div className="flex flex-col space-y-2">
              {/* Only show skeletons if data is loading AND we are not yet on the client (initial server render) */}
              {isLoadingUser && !isClient ? (
                // Skeleton loading for navigation items
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-lg" />
                ))
              ) : (
                navigationItems
                  .filter((item) => {
                    if (
                      userRole !== "SUPER" &&
                      (item.name === "Settings" || item.name === "Admin")
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                    <div
                      key={item.name}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors duration-200
                                ${
                                  pathname === item.path // Use pathname instead of activeItem
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-primary/10 hover:text-primary text-muted-foreground"
                                }`}
                      onClick={() => handleNavigation(item.name, item.path)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* User Details - Fixed at bottom */}
        <UserDetails onUserFetched={handleUserFetched} />
      </div>
    </div>
  );
};

// Mini Sidebar Component (Collapsed)
const MiniSidebar = ({ toggleSidebar }: SidebarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname(); // Get current pathname
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // New loading state for user data
  const [isClient, setIsClient] = useState(false); // New state to track if client-side mounted

  // After mounting, we have access to the theme
  React.useEffect(() => {
    setMounted(true);
    setIsClient(true); // Set client mounted after initial render
  }, []);

  const handleNavigation = (item: string, path?: string) => {
    if (path) {
      router.push(path);
    }
  };

  const handleUserFetched = (user: User | null) => {
    if (user) {
      setUserRole(user.role);
    } else {
      setUserRole(null);
    }
    setIsLoadingUser(false); // User data has been fetched (or failed to fetch)
  };

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="hidden sm:flex flex-col items-center py-6 px-3 bg-background border-r rounded-r-3xl shadow-lg flex-shrink-0 w-20 transition-all duration-300 h-screen">
      <div className="flex flex-col items-center space-y-4 mb-8">
        <div
          className="p-2 rounded-lg hover:bg-primary hover:text-primary-foreground cursor-pointer"
          onClick={toggleSidebar}
        >
          <MenuIcon />
        </div>
        <ThemeToggle
          isDark={resolvedTheme === "dark"}
          onToggle={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          size="iconOnly"
        />
      </div>

      <div className="flex flex-col space-y-6 flex-grow">
        {/* Only show skeletons if data is loading AND we are not yet on the client (initial server render) */}
        {isLoadingUser && !isClient ? (
          // Skeleton loading for navigation items in mini sidebar
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-8 rounded-lg" />
          ))
        ) : (
          navigationItems
            .filter((item) => {
              if (
                userRole !== "SUPER" &&
                (item.name === "Settings" || item.name === "Admin")
              ) {
                return false;
              }
              return true;
            })
            .map((item) => (
              <div
                key={item.name}
                className={`p-2 rounded-lg cursor-pointer relative group font-bold
                                ${
                                  pathname === item.path // Use pathname instead of activeItem
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-primary hover:text-accent-foreground text-muted-foreground"
                                }`}
                onClick={() => handleNavigation(item.name, item.path)}
              >
                {item.icon}
                {/* Tooltip for active item */}
                {pathname === item.path && ( // Use pathname instead of activeItem
                  <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {item.name}
                  </span>
                )}
                {/* Tooltip for all items on hover */}
                {pathname !== item.path && ( // Use pathname instead of activeItem
                  <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {item.name}
                  </span>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Effect to determine if it's a mobile view and adjust sidebar state
  useEffect(() => {
    const handleResize = () => {
      // Tailwind's 'sm' breakpoint is 640px
      const currentIsMobile = window.innerWidth < 640;
      setIsMobile(currentIsMobile);

      if (currentIsMobile) {
        // On mobile, sidebar should be collapsed by default
        setIsSidebarExpanded(false);
      } else {
        // On desktop, sidebar should be expanded by default
        setIsSidebarExpanded(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call once on mount to set initial state

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <>
      {/* Sidebar Area */}
      {isSidebarExpanded ? (
        <MainSidebar
          toggleSidebar={toggleSidebar}
          isMobile={isMobile} // Pass isMobile to MainSidebar
        />
      ) : (
        <MiniSidebar
          toggleSidebar={toggleSidebar}
        />
      )}

      {/* Backdrop for mobile sidebar when expanded */}
      {isMobile && isSidebarExpanded && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

export default Sidebar;