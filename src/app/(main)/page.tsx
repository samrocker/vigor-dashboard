"use client"
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/users");
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