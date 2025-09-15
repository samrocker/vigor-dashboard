"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Image as LucideImage,
  RefreshCw,
  Trash2,
  Eye,
  Search,
  Upload,
  Edit2,
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// SHADCN
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth";

type ImageType = "HERO" | "LOGO" | "ICON";
const IMAGE_TYPES: ImageType[] = ["HERO", "LOGO", "ICON"];

type Image = {
  id: string;
  url: string;
  type: ImageType | null;
  createdAt: string;
  updatedAt: string;
};

type AdminRole = "SUPER" | "SUB";

const AllImagesPage: React.FC = () => {
  const router = useRouter();
  // Authentication and access state
  const [roleLoading, setRoleLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Gallery states
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ImageType>("HERO");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<ImageType>("HERO");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<Image | null>(null);
  const [editType, setEditType] = useState<ImageType>("HERO");
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Role check and redirect
  const checkUserRole = useCallback(async () => {
    setRoleLoading(true);
    try {
      const { data } = await axiosInstance.get(
        "/admin/me?includeRelations=true",
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );
      const adminData = data.data.admin;
      if (adminData.role === "SUB") {
        router.replace("/users");
        return;
      }
      setHasAccess(adminData.role === "SUPER");
    } catch {
      router.replace("/users");
    } finally {
      setRoleLoading(false);
    }
  }, [router]);

  // Fetch images
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/public/image`);
      setImages(data.data.images);
    } catch (error) {
      toast.error("Failed to fetch images.");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (hasAccess) {
      fetchImages();
    }
  }, [hasAccess, fetchImages]);

  // Filtered images for UI
  const filteredImages = useMemo(() => {
    return images
      .filter((img) => img.type === activeTab)
      .filter(
        (img) =>
          img.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          new Date(img.createdAt)
            .toLocaleDateString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
  }, [images, activeTab, searchQuery]);

  // Stats per type + total
  const imageStats = useMemo(() => {
    const counts = IMAGE_TYPES.reduce((acc, type) => {
      acc[type] = images.filter((img) => img.type === type).length;
      return acc;
    }, {} as Record<ImageType, number>);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return { ...counts, TOTAL: total };
  }, [images]);

  // Upload handler
  const handleFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
    } else {
      toast.error("Please select a valid image file.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onUpload = async () => {
    if (!file) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data: uploadRes } = await axiosInstance.post(
        `/admin/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const imageId = uploadRes.data.image.id;
      await axiosInstance.patch(`/admin/image/${imageId}`, {
        type: uploadType,
      });
      setFile(null);
      setShowUploadDialog(false);
      await fetchImages();
      toast.success("Image uploaded successfully!");
    } catch {
      toast.error("Image upload failed. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Drag and drop setup for upload dialog
  useEffect(() => {
    const div = dropRef.current;
    if (!div || !showUploadDialog) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };
    div.addEventListener("dragover", handleDragOver);
    div.addEventListener("dragleave", handleDragLeave);
    div.addEventListener("drop", handleDrop);
    return () => {
      div.removeEventListener("dragover", handleDragOver);
      div.removeEventListener("dragleave", handleDragLeave);
      div.removeEventListener("drop", handleDrop);
    };
  }, [showUploadDialog]);

  // Edit handler
  const handleEdit = (img: Image) => {
    setImageToEdit(img);
    setEditType(img.type || "HERO");
    setShowEditDialog(true);
  };

  const onSaveEdit = async () => {
    if (!imageToEdit) return;
    setEditLoading(true);
    try {
      await axiosInstance.patch(`/admin/image/${imageToEdit.id}`, {
        type: editType,
      });
      setShowEditDialog(false);
      await fetchImages();
      toast.success("Image type updated successfully!");
    } catch {
      toast.error("Failed to update image type. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchQuery("");
    await fetchImages();
    setRefreshing(false);
  };

  // Delete handlers
  const handleDelete = (imageId: string) => {
    setImageToDelete(imageId);
    setShowDeleteConfirmation(true);
  };
  const executeDelete = async () => {
    if (!imageToDelete) return;
    setDeletingImage(true);
    try {
      await axiosInstance.delete(`/admin/image/${imageToDelete}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `bearer ${getAccessToken()}`,
        },
      });
      toast.success("Image deleted successfully.");
      await fetchImages();
    } catch {
      toast.error("Failed to delete image. Please try again.");
    } finally {
      setDeletingImage(false);
      setShowDeleteConfirmation(false);
      setImageToDelete(null);
    }
  };
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setImageToDelete(null);
  };

  // Preview handler
  const handlePreview = (img: Image) => {
    setPreviewImage(img);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Title and Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-muted">
                <LucideImage className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Image Gallery Management
                </h1>
                <p className="text-muted-foreground">
                  Upload, edit, delete, and manage your images efficiently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {IMAGE_TYPES.map((type, idx) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * idx, duration: 0.5 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </CardTitle>
                  <LucideImage className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-xl font-bold text-foreground">
                      {imageStats[type]}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-6 justify-center sm:justify-start">
              {IMAGE_TYPES.map((type) => (
                <Button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  variant={activeTab === type ? "default" : "outline"}
                  className="font-semibold"
                >
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by ID or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw
                    className={`h-5 w-5 mr-2 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload New
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Image Gallery */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {[...Array(10)].map((_, idx) => (
                <Skeleton key={idx} className="h-64 w-full rounded-xl" />
              ))}
            </motion.div>
          ) : filteredImages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground text-lg">
                  No images found. Try uploading new ones or adjusting your
                  search.
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {filteredImages.map((img, idx) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="relative group overflow-hidden hover:shadow-lg transition-shadow">
                    <button
                      onClick={() => handlePreview(img)}
                      className="w-full"
                      aria-label={`Preview ${img.id}`}
                    >
                      <img
                        src={img.url}
                        alt={`${img.type} image ${img.id}`}
                        className="rounded-t-xl w-full h-auto group-hover:scale-105 transition-transform duration-300 p-4"
                      />
                    </button>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="uppercase">
                          {img.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(img.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex justify-end p-4 pt-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(img)}
                        className="mr-2 hover:bg-accent"
                        aria-label="Preview image"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(img)}
                        className="mr-2 hover:bg-accent"
                        aria-label="Edit image"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingImage && imageToDelete === img.id}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Upload className="mr-2 h-6 w-6" />
                Upload New Image
              </DialogTitle>
            </DialogHeader>
            <div
              ref={dropRef}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                isDragging ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <p className="text-lg font-medium text-foreground mb-2">
                  Drag and drop an image here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select
                </p>
              </Label>
              <div className="mb-4 woverflow-hidden">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="w-full text-ellipsis overflow-hidden whitespace-nowrap"
                />
              </div>
              <Select
                value={uploadType}
                onValueChange={(v) => setUploadType(v as ImageType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={uploadLoading}
              >
                Cancel
              </Button>
              <Button onClick={onUpload} disabled={uploadLoading || !file}>
                {uploadLoading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit2 className="mr-2 h-6 w-6" />
                Edit Image Type
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-type">Image Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as ImageType)}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button onClick={onSaveEdit} disabled={editLoading}>
                {editLoading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Trash2 className="mr-2 h-6 w-6 text-destructive" />
                Delete Image
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to permanently delete this image? This
              action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={deletingImage}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={executeDelete}
                disabled={deletingImage}
              >
                {deletingImage ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog
          open={!!previewImage}
          onOpenChange={() => setPreviewImage(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewImage?.type} Image Preview</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="flex flex-col items-center">
                <img
                  src={previewImage.url}
                  alt={`${previewImage.type} image ${previewImage.id}`}
                  className="max-h-[60vh] w-auto rounded-lg"
                />
                <div className="mt-4 w-full flex justify-between text-sm text-muted-foreground">
                  <span>ID: {previewImage.id}</span>
                  <span>
                    Created: {new Date(previewImage.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AllImagesPage;
