"use client"
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Added motion import

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full flex-center flex-col"
    >
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-4 w-32" />
    </motion.div>
  );
}