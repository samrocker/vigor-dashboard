"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { User } from "@/types/schemas/user";
import AllSettingPage from "@/components/setting/AllSetting";

const Setting = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await axiosInstance.get("/admin/me?includeRelations=true");
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
    return <div>Loading...</div>; // Or a more sophisticated loading component
  }

  if (userRole !== "SUPER") {
    return null; // Don't render the page content if redirecting
  }

  return <AllSettingPage />;
};

export default Setting;
