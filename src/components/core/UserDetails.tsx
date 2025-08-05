"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { User } from "@/types/schemas/user";
import { Skeleton } from "../ui/skeleton";
import Image from "next/image";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { deleteTokens } from "@/lib/auth";
import { Badge } from "../ui/badge";

interface UserDetailsProps {
  onUserFetched: (user: User | null) => void;
}

const UserDetails = ({ onUserFetched }: UserDetailsProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axiosInstance.get("/admin/me?includeRelations=true");
        if (response.data.status === "success") {
          setUser(response.data.data.admin);
          onUserFetched(response.data.data.admin);
        } else {
          setError(response.data.message || "Failed to fetch user details.");
          onUserFetched(null);
        }
      } catch (err) {
        setError("Error fetching user details.");
        console.error("Error fetching user details:", err);
        onUserFetched(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [onUserFetched]);

  const handleLogout = () => {
    deleteTokens();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-4 border-t border-border pt-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm mt-4">{error}</div>;
  }

  if (!user) {
    return <div className="text-muted-foreground text-sm mt-4">No user data available.</div>;
  }

  return (
    <div className="border-t border-border pt-4 mt-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
          {user.name ? user.name[0].toUpperCase() : "U"}
          {/* You can replace this with an actual user image if available */}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm truncate">{user.name}</span>
          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          <Badge className={`px-3 mt-2 py-1 rounded-sm ${
                                user.role == 'SUPER'
                                  ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/20"
                                  : "bg-red-100 text-red-500 hover:bg-red-100"
                              } max-w-fit`}>{user.role} ADMIN</Badge>
        </div>
      </div>
      <Button variant="outline" className="w-full hover:bg-red-500" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};

export default UserDetails;

// types/sidebar.ts
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