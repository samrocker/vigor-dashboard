"use client";
import Image from "next/image";
import sideBG from "../../../public/images/login.jpg";
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { getAccessToken, setTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ApiResponse, axiosInstance } from "@/lib/axios";

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const accessToken = getAccessToken();

  // Redirect if already authenticated
  useEffect(() => {
    if (accessToken) {
      router.push("/dashboard");
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(
        () => setResendTimer(resendTimer - 1),
        1000
      );
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setMessage(""); // Clear previous messages
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        `/auth/admin/login`,
        { email },
      );

      // Assuming a successful response from backend means OTP was sent
      // The message "Login initiated successfully. Please check your email for the OTP."
      // is likely coming from your backend's API response.
      // We should display that message and then show the OTP input.
      // Check for success status from API response (e.g., response.data.status === 'success')
      // If the backend sends this message in `response.data.message`, use that.
      if (response.data?.status === "success") { // Or check response.status === 200
        setShowOtpInput(true);
        setMessage(response.data.message || "Login initiated successfully. Please check your email for the OTP.");
        setResendTimer(30); // Start the resend timer
      } else {
        // If API response status is not 'success' but no error thrown
        setError(response.data?.message || "Error sending OTP. Please try again.");
      }
    } catch (err: any) {
      // Catch network errors or API errors (e.g., 4xx, 5xx)
      setError(
        err.response?.data?.message || "Error sending OTP. Please try again."
      );
      setShowOtpInput(false); // Ensure OTP input is not shown on error
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axiosInstance.post<ApiResponse<{ accessToken: string, refreshToken: string }>>(
        `/auth/admin/verify-login`,
        { email, code: otp },
      );
      const data = response.data.data;

      if (data && data.accessToken && data.refreshToken) {
        setMessage("Login successful!");
        setTokens(data.accessToken, data.refreshToken);
        router.push("/dashboard");
      } else {
        setError("Login failed: Missing token data from response.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        `/auth/admin/resend-otp`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessage(response.data.message || "OTP resent to your email"); // Use message from API response
      setResendTimer(30); // 30 seconds timeout
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Error resending OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-background via-primary/10 to-background">
      {/* Left Section - Image */}
      <div className="relative w-1/2 hidden lg:block">
        <Image
          src={sideBG}
          alt="Login Background"
          fill
          className="object-cover rounded-r-3xl shadow-2xl"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent rounded-r-3xl" />
        <div className="absolute bottom-8 left-8 text-white drop-shadow-xl">
          <h3 className="text-3xl font-extrabold tracking-tight">
            Your Professional Platform
          </h3>
          <p className="mt-2 text-lg opacity-90 font-medium">
            Join a community of innovators and professionals.
          </p>
        </div>
      </div>

      {/* Right Section - Sign In Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white/90 dark:bg-black/80 rounded-2xl shadow-2xl px-8 py-10 border border-border backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/images/logo.png"
              alt="Vigor Logo"
              width={80}
              height={80}
              className="mb-3 dark:invert drop-shadow-lg"
            />
            <h2 className="text-4xl font-extrabold text-foreground tracking-tight">
              Welcome Back
            </h2>
            <p className="mt-1 text-base text-muted-foreground font-medium">
              Sign in to access your account
            </p>
          </div>

          {!showOtpInput ? (
            <form onSubmit={handleEmailSubmit} className="space-y-7">
              <div>
                <label
                  htmlFor="email"
                  className="block text-base font-semibold text-muted-foreground mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all duration-200 bg-background text-foreground placeholder-muted-foreground outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Display error message in red */}
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
              {/* Display success message in green */}
              {message && (
                <p className="text-sm text-green-600 font-medium">{message}</p>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold text-base transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                    Sending...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-7">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-base font-semibold text-muted-foreground mb-1"
                >
                  OTP Code
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  placeholder="Enter OTP"
                  className="w-full px-4 py-3 border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all duration-200 bg-background text-foreground placeholder-muted-foreground outline-none tracking-widest text-center font-mono"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              {/* Display error message in red */}
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
              {/* Display success message in green */}
              {message && (
                <p className="text-sm text-green-600 font-medium">{message}</p>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold text-base transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 underline disabled:opacity-60 font-semibold"
                  onClick={handleResendOtp}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0
                    ? `Resend OTP (${resendTimer}s)`
                    : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}