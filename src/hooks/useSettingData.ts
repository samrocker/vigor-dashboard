import { useEffect, useState } from "react";
import { toast } from "sonner"
import { SettingFormValues } from "@/types/schemas/setting";
import { imageSchema } from "@/types/schemas/image";
import axiosInstance from "@/lib/axios";

interface SettingData {
  setting: SettingFormValues | null;
  logo: imageSchema | null;
  icon: imageSchema | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: SettingFormValues) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  uploadIcon: (file: File) => Promise<void>;
  deleteLogo: () => Promise<void>;
  deleteIcon: () => Promise<void>;
}

export const useSettingData = (): SettingData => {
  const [setting, setSetting] = useState<SettingFormValues | null>(null);
  const [logo, setLogo] = useState<imageSchema | null>(null);
  const [icon, setIcon] = useState<imageSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingRes, logoRes, iconRes] = await Promise.all([
        axiosInstance.get("/public/setting?includeRelations=true"),
        axiosInstance.get("/public/setting/logo"),
        axiosInstance.get("/public/setting/icon"),
      ]);
      setSetting(settingRes.data.data.setting);
      setLogo(logoRes.data.data.logo);
      setIcon(iconRes.data.data.icon);
    } catch (err) {
      setError("Failed to fetch settings data.");
      toast.error("Failed to fetch settings data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: SettingFormValues) => {
    try {
      const res = await axiosInstance.patch("admin/setting", data);
      setSetting(res.data.data.setting); // Update setting state directly with the response
      toast.success("Settings updated successfully!");
    } catch (err) {
      setError("Failed to update settings.");
      toast.error("Failed to update settings.");
      console.error(err);
      throw err; // Re-throw to allow form to catch error
    }
  };

  const uploadImage = async (url: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await axiosInstance.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Image uploaded successfully!");
      if (url.includes("icon")) {
        return res.data.data.icon;
      }
      return res.data.data.logo;
    } catch (err: any) {
      setError(`Failed to upload image to ${url}.`);
      if (err.response && err.response.status === 413) {
        toast.error("Image too large. Please upload an image smaller than 5MB.");
      } else {
        toast.error(`Failed to upload image to ${url}.`);
      }
      console.error(err);
      throw err; // Re-throw to allow component to catch error
    }
  };

  const uploadLogo = async (file: File) => {
    const data = await uploadImage("/admin/setting/logo", file);
    setLogo(data);
  };

  const uploadIcon = async (file: File) => {
    const data = await uploadImage("/admin/setting/icon", file);
    setIcon(data);
  };

  const deleteImage = async (url: string) => {
    try {
      await axiosInstance.delete(url);
      toast.success("Image deleted successfully!");
    } catch (err) {
      setError(`Failed to delete image from ${url}.`);
      toast.error(`Failed to delete image from ${url}.`);
      console.error(err);
      throw err;
    }
  };

  const deleteLogo = async () => {
    await deleteImage("/admin/setting/logo");
    setLogo(null);
  };

  const deleteIcon = async () => {
    await deleteImage("/admin/setting/icon");
    setIcon(null);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    setting,
    logo,
    icon,
    loading,
    error,
    fetchSettings,
    updateSettings,
    uploadLogo,
    uploadIcon,
    deleteLogo,
    deleteIcon,
  };
};
