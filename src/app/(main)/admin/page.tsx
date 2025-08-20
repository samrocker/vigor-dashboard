"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import AllAdminPage from "@/components/Admins/AllAdminPage";
import React from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const AllAdmin = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await axiosInstance.get(
          "/admin/me?includeRelations=true"
        );
        if (response.data.status === "success" && response.data.data.admin) {
          setUserRole(response.data.data.admin.role);
          if (response.data.data.admin.role !== "SUPER") {
            router.push("/users");
          }
        } else {
          router.push("/users");
        }
      } catch (error) {
        router.push("/users");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center gap-5">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== "SUPER") {
    return null;
  }

  return <AllAdminPage userRole={userRole} />;
};

export default AllAdmin;
