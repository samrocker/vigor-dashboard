"use client";
import Applayout from "@/components/core/Applayout";
import AppSidebar from "@/components/core/sidebar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import React from "react";

const DashboardPage = () => {
  const router = useRouter();
  const accessToken = getAccessToken();

  if (accessToken) {
    router.push("/users");
  }

  return <LoadingSpinner />;
};

export default DashboardPage;