"use client"
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";

export default function Home() {
  const router = useRouter();
  const accessToken = Cookies.get("accessToken");

  // useEffect(() => {
  //   if (!accessToken) {
  //     router.push("/login");
  //   }
  // }, [router]);

  // useEffect(() => {
  //   if (accessToken) {
  //     router.push("/dashboard");
  //   }
  // }, [router]);

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="h-screen w-full flex-center">
      <LoadingSpinner />
    </div>
  );
}
