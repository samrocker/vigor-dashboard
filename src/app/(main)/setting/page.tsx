"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { User } from "@/types/schemas/user";
import AllSettingPage from "@/components/setting/AllSetting";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Setting = () => {
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
          router.push("/users"); // Redirect if user data not found or API error
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        router.push("/users"); // Redirect on any error
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
    return null; // Don't render the page content if redirecting
  }

  return <AllSettingPage />;
};

export default Setting;
