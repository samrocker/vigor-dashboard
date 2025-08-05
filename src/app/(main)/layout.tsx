import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import Applayout from "@/components/core/Applayout";
import { Toaster } from "@/components/ui/sonner"
// import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Vigor Bikes Dashboard",
  description: "Vigor Bikes Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-outfit">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Applayout>{children}</Applayout>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
