"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"; // Ensure this is imported for toasts
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SettingFormValues, SettingSchema } from "@/types/schemas/setting";
import { useSettingData } from "@/hooks/useSettingData";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const AllSettingPage = () => {
  const {
    setting,
    logo,
    icon,
    loading,
    // Removed error state as per requirement. The hook now handles toasting errors.
    updateSettings,
    uploadLogo,
    uploadIcon,
    deleteLogo,
    deleteIcon,
  } = useSettingData();

  const form = useForm<SettingFormValues>({
    resolver: zodResolver(SettingSchema),
    defaultValues: {
      websiteName: "",
      tagline: "",
      primaryPhone: "",
      secondaryPhone: "",
      email: "",
      address: {
        street: "",
        "house number": 0,
        landmark: "",
      },
      value: {
        gstin: "",
        taxRate: 0,
      },
    },
  });

  useEffect(() => {
    if (setting) {
      form.reset({
        websiteName: setting.websiteName || "",
        tagline: setting.tagline || "",
        primaryPhone: setting.primaryPhone || "",
        secondaryPhone: setting.secondaryPhone || "",
        email: setting.email || "",
        address: {
          street: setting.address?.street || "",
          "house number": setting.address?.["house number"] || 0,
          landmark: setting.address?.landmark || "",
        },
        value: {
          gstin: setting.value?.gstin || "",
          taxRate: setting.value?.taxRate || 0,
        },
      });
    }
  }, [setting, form]);

  const onSubmit = async (data: SettingFormValues) => {
    try {
      await updateSettings(data);
    } catch (err) {
      // Error handled in useSettingData hook, no need to re-toast or setError here.
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      await uploadLogo(event.target.files[0]);
    }
  };

  const handleIconUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      await uploadIcon(event.target.files[0]);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto p-4"
      >
        {/* Header Skeleton */}
        <Skeleton className="h-10 w-64 mb-6" />
        {/* Image Upload Skeletons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5"
        >
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" /> {/* CardTitle for Logo */}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-lg" />{" "}
                {/* Logo image skeleton */}
                <Skeleton className="h-10 w-32" /> {/* Delete/Upload button */}
              </div>
              <Skeleton className="h-4 w-24 mb-2" /> {/* Label skeleton */}
              <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" /> {/* CardTitle for Icon */}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-lg" />{" "}
                {/* Icon image skeleton */}
                <Skeleton className="h-10 w-32" /> {/* Delete/Upload button */}
              </div>
              <Skeleton className="h-4 w-24 mb-2" /> {/* Label skeleton */}
              <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
            </CardContent>
          </Card>
        </motion.div>

        {/* General Settings Card Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" /> {/* CardTitle */}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(5)].map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-4 w-24 mb-2" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Address Card Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" /> {/* CardTitle */}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(3)].map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-4 w-24 mb-2" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Financial Details Card Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" /> {/* CardTitle */}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-4 w-24 mb-2" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Save Button Skeleton */}
        <Skeleton className="h-10 w-full mb-8" />
        <Skeleton className="h-1 w-full my-8" /> {/* Separator Skeleton */}
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5"
          >
            <Card>
              <CardHeader>
                <CardTitle>Website Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {logo ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={logo.url}
                      alt="Website Logo"
                      className="h-20 w-20 object-contain"
                    />
                    <Button
                      variant="destructive"
                      onClick={deleteLogo}
                      disabled={form.formState.isSubmitting}
                    >
                      Delete Logo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="logo-upload">Upload Logo</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={form.formState.isSubmitting}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="">
              <CardHeader>
                <CardTitle>Website Icon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {icon ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={icon.url}
                      alt="Website Icon"
                      className="h-20 w-20 object-contain"
                    />
                    <Button
                      variant="destructive"
                      onClick={deleteIcon}
                      disabled={form.formState.isSubmitting}
                    >
                      Delete Icon
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="icon-upload">Upload Icon</Label>
                    <Input
                      id="icon-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      disabled={form.formState.isSubmitting}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="websiteName">Website Name</Label>
                <Input
                  id="websiteName"
                  {...form.register("websiteName")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.websiteName && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.websiteName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  {...form.register("tagline")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.tagline && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.tagline.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="primaryPhone">Primary Phone</Label>
                <Input
                  id="primaryPhone"
                  {...form.register("primaryPhone")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.primaryPhone && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.primaryPhone.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                <Input
                  id="secondaryPhone"
                  {...form.register("secondaryPhone")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.secondaryPhone && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.secondaryPhone.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  {...form.register("address.street")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.address?.street && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.address.street.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="houseNumber">House Number</Label>
                <Input
                  id="houseNumber"
                  type="number"
                  {...form.register("address.house number", {
                    valueAsNumber: true,
                  })}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.address?.["house number"] && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.address["house number"].message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  {...form.register("address.landmark")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.address?.landmark && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.address.landmark.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  {...form.register("value.gstin")}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.value?.gstin && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.value.gstin.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  {...form.register("value.taxRate", { valueAsNumber: true })}
                  disabled={form.formState.isSubmitting}
                />
                {form.formState.errors.value?.taxRate && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.value.taxRate.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2" /> Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </form>

      <Separator className="my-8" />
    </div>
  );
};

export default AllSettingPage;