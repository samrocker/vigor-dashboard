// app/categories/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import { Category, SubCategory } from "@/types/schemas"; // Reuse Category and SubCategory types
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  FolderOpen, // For category main icon
  Info, // General information
  Calendar, // For dates
  ArrowLeft, // For back button
  Package, // For products section (though not directly used in this view for products, kept for consistency if needed)
  Eye, // For view details
  Plus, // For add image/subcategory
  Trash2, // For delete image/subcategory
  ImageIcon, // For images section
  CheckCircle, // For true boolean status
  XCircle, // For false boolean status
  Edit, // For edit icon
} from "lucide-react";
import { toast } from "sonner";

// --- Type Definitions (UPDATED/REUSED) ---

// Product interface (simplified for display here)
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  subCategoryId: string;
  createdAt: string;
  updatedAt: string;
}

// Image Type Definition for Category (aligning with SubCategoryImage)
interface CategoryImage {
  id: string;
  url: string;
  isHeroImage: boolean;
  isLogo: boolean;
  isIcon: boolean;
  productId: string | null;
  categoryId: string | null; // This will be used for association
  subCategoryId: string | null;
  blogId: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Response for single category with relations
export interface CategoryDetailsApiResponse extends ApiResponse {
  data: {
    category: Category & {
      image?: CategoryImage; // Changed to single image object, not array
      subCategories?: SubCategory[];
    };
  };
}

export interface SubCategoriesApiResponse extends ApiResponse {
  data: {
    subCategories: SubCategory[];
  };
}

// New type definition for Categories API response (needed for subcategory creation form)
export interface CategoriesApiResponse extends ApiResponse {
  data: {
    categories: Category[];
  };
}

// --- Utility Functions ---
function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Invalid Date";
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

// --- Component ---
const CategoryDetailsPage = () => {
  const params = useParams();
  const categoryId = params.id as string;
  const router = useRouter();

  // --- State Definitions ---
  const [category, setCategory] = useState<
    (Category & { image?: CategoryImage; subCategories?: SubCategory[] }) | null
  >(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subcategory Creation states
  const [isCreateSubCategoryDialogOpen, setIsCreateSubCategoryDialogOpen] =
    useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [createSubCategoryForm, setCreateSubCategoryForm] = useState({
    name: "",
    description: "",
    categoryId: categoryId, // Pre-fill with current category's ID
  });

  // Subcategory Edit states
  const [isEditSubCategoryDialogOpen, setIsEditSubCategoryDialogOpen] =
    useState(false);
  const [isEditingSubCategory, setIsEditingSubCategory] = useState(false);
  const [editSubCategoryForm, setEditSubCategoryForm] = useState({
    id: "",
    name: "",
    description: "",
  });

  // Subcategory Delete states
  const [isDeleteSubCategoryDialogOpen, setIsDeleteSubCategoryDialogOpen] =
    useState(false);
  const [subCategoryToDeleteId, setSubCategoryToDeleteId] = useState<
    string | null
  >(null);
  const [isDeletingSubCategory, setIsDeletingSubCategory] = useState(false);

  // Image CRUD states (adapted for Category page)
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadImageForm, setUploadImageForm] = useState<{
    image: File | null;
    categoryId: string | null; // Auto-associate with current category
  }>({
    image: null,
    categoryId: categoryId,
  });
  const [isUploadImageLoading, setIsUploadImageLoading] = useState(false);

  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);

  // --- Callbacks (MUST come before useEffects that depend on them) ---

  const fetchCategoryDetails = useCallback(
    async (id: string) => {
      setLoadingCategory(true);
      setLoadingSubCategories(true); // Ensure subcategory loading is true
      try {
        // Ensure 'image' and 'subCategories' relations are included
        const response = await axiosInstance.get<CategoryDetailsApiResponse>(
          `/public/category/${id}?includeRelations=true`
        );
        if (
          response.data.status === "success" &&
          response.data.data?.category
        ) {
          setCategory(response.data.data.category);
          // Assuming subCategories come with category details
          setSubCategories(response.data.data.category.subCategories || []);
          setError(null);
        } else {
          setError(
            response.data.message || "Failed to fetch category details."
          );
          setCategory(null);
          setSubCategories([]);
        }
      } catch (err: any) {
        setError(
          err.message ||
            "An unexpected error occurred while fetching category details."
        );
        setCategory(null);
        setSubCategories([]);
        toast.error("Failed to load category details.");
      } finally {
        setLoadingCategory(false);
        setLoadingSubCategories(false);
      }
    },
    [] // No external dependencies for this useCallback
  );

  // --- Effects ---
  // Fetch category details and subcategories on component mount or categoryId change
  useEffect(() => {
    if (categoryId) {
      fetchCategoryDetails(categoryId);
    }
  }, [categoryId, fetchCategoryDetails]); // 'fetchCategoryDetails' is now declared before this useEffect

  // --- Event Handlers ---

  const handleViewProductDetails = (productId: string) => {
    // Adjusted to admin-specific product details page for consistency
    router.push(`/product/${productId}`);
  };

  const handleViewSubCategoryDetails = (subCategoryId: string) => {
    // Adjusted to admin-specific subcategory details page for consistency
    router.push(`/subcategory/${subCategoryId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/image/${imageId}`); // Assuming an admin images page exists
  };

  // --- Image CRUD Handlers ---

  const handleOpenUploadImageDialog = () => {
    setUploadImageForm((prev) => ({
      ...prev,
      image: null,
      categoryId: categoryId,
    }));
    setIsUploadImageDialogOpen(true);
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadImageLoading(true);
    setError(null);

    if (!uploadImageForm.image) {
      toast.error("Image file is required.");
      setIsUploadImageLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadImageForm.image);
    formData.append("categoryId", categoryId);

    try {
      const response = await axiosInstance.post("/admin/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        toast.success("Image uploaded successfully!");
        setIsUploadImageDialogOpen(false);
        setUploadImageForm({
          image: null,
          categoryId: categoryId,
        });
        fetchCategoryDetails(categoryId); // Re-fetch category details to update images list
      } else {
        toast.error(response.data.message || "Failed to upload image.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
      if (err.response && err.response.status === 413) {
        toast.error(
          "Image too large. Please upload an image smaller than 5MB."
        );
      } else {
        toast.error(err.response?.data?.message || "Error uploading image.");
      }
    } finally {
      setIsUploadImageLoading(false);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (!imageToDeleteId) return;

    setIsDeleteImageLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.delete(
        `/admin/image/${imageToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Image deleted successfully!");
        setIsDeleteImageDialogOpen(false);
        setImageToDeleteId(null);
        fetchCategoryDetails(categoryId); // Re-fetch category details to update images list
      } else {
        toast.error(response.data.message || "Failed to delete image.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during deletion.");
      toast.error(err.response?.data?.message || "Error deleting image.");
    } finally {
      setIsDeleteImageLoading(false);
    }
  };

  const handleOpenDeleteImageDialog = (imageId: string) => {
    setImageToDeleteId(imageId);
    setIsDeleteImageDialogOpen(true);
  };

  // --- Subcategory CRUD Handlers ---

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubCategoryForm.name.trim()) {
      toast.error("Subcategory name is required.");
      return;
    }
    if (!createSubCategoryForm.categoryId.trim()) {
      toast.error("Category is required for subcategory.");
      return;
    }

    setIsCreatingSubCategory(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/admin/sub-category", {
        name: createSubCategoryForm.name,
        description: createSubCategoryForm.description,
        categoryId: createSubCategoryForm.categoryId,
      });

      if (response.data.status === "success" && response.data.data) {
        toast.success("Subcategory created successfully!");
        setIsCreateSubCategoryDialogOpen(false);
        setCreateSubCategoryForm({
          name: "",
          description: "",
          categoryId: categoryId, // Reset and pre-fill
        });
        fetchCategoryDetails(categoryId); // Re-fetch category details to update subcategories list
      } else {
        toast.error(response.data.message || "Failed to create subcategory.");
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred during subcategory creation."
      );
      toast.error(err.response?.data?.message || "Error creating subcategory.");
    } finally {
      setIsCreatingSubCategory(false);
    }
  };

  const handleOpenEditSubCategoryDialog = (subCategory: SubCategory) => {
    setEditSubCategoryForm({
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description || "",
    });
    setIsEditSubCategoryDialogOpen(true);
  };

  const handleEditSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubCategoryForm.name.trim()) {
      toast.error("Subcategory name is required.");
      return;
    }

    setIsEditingSubCategory(true);
    setError(null);
    try {
      const response = await axiosInstance.patch(
        `/admin/sub-category/${editSubCategoryForm.id}`,
        {
          name: editSubCategoryForm.name,
          description: editSubCategoryForm.description,
        }
      );

      if (response.data.status === "success") {
        toast.success("Subcategory updated successfully!");
        setIsEditSubCategoryDialogOpen(false);
        setEditSubCategoryForm({ id: "", name: "", description: "" });
        fetchCategoryDetails(categoryId); // Re-fetch category details to update list
      } else {
        toast.error(response.data.message || "Failed to update subcategory.");
      }
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred during subcategory update."
      );
      toast.error(err.response?.data?.message || "Error updating subcategory.");
    } finally {
      setIsEditingSubCategory(false);
    }
  };

  const handleOpenDeleteSubCategoryDialog = (subCategoryId: string) => {
    setSubCategoryToDeleteId(subCategoryId);
    setIsDeleteSubCategoryDialogOpen(true);
  };

  const handleConfirmDeleteSubCategory = async () => {
    if (!subCategoryToDeleteId) return;

    setIsDeletingSubCategory(true);
    setError(null);
    try {
      const response = await axiosInstance.delete(
        `/admin/sub-category/${subCategoryToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Subcategory deleted successfully!");
        setIsDeleteSubCategoryDialogOpen(false);
        setSubCategoryToDeleteId(null);
        fetchCategoryDetails(categoryId); // Re-fetch category details to update list
      } else {
        toast.error(response.data.message || "Failed to delete subcategory.");
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred during subcategory deletion."
      );
      toast.error(err.response?.data?.message || "Error deleting subcategory.");
    } finally {
      setIsDeletingSubCategory(false);
    }
  };

  // --- Render Loading/Error/Not Found States ---
  if (loadingCategory) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full"
      >
        {/* Header Section Skeleton */}
        <div className="w-full max-w-7xl mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Main Content Area Skeletons */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Category Information Card Skeleton */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div className="md:col-span-1 flex flex-col items-center justify-start p-4 border border-dashed rounded-md bg-muted/20">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="w-full h-48 sm:h-64 rounded-md mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Subcategories Section Skeleton */}
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="border-border shadow-sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-32" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (error && !category) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full"
      >
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>{error}</p>
              <Button
                onClick={() => router.back()}
                className="mt-4 hover:bg-primary"
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!category) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full"
      >
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Category not found.</p>
              <Button
                onClick={() => router.back()}
                className="mt-4 hover:bg-primary"
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {category.name}
                </h1>
                <span className="text-muted-foreground">
                  {category.description || "No description provided."}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/category')}
              className="hover:bg-primary"
              disabled={loadingCategory}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Category Information
              </CardTitle>
              <CardDescription>
                Comprehensive details about this category.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Left Column - Category Details */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category ID */}
                <div>
                  <p className="text-muted-foreground">ID:</p>
                  <span className="font-medium text-foreground break-all">
                    {category.id}
                  </span>
                </div>
                {/* Name */}
                <div>
                  <p className="text-muted-foreground">Name:</p>
                  <span className="font-medium text-foreground">
                    {category.name}
                  </span>
                </div>
                {/* Created At */}
                <div>
                  <p className="text-muted-foreground">Created At:</p>
                  <span className="font-medium text-foreground flex items-center">
                    {formatDate(category.createdAt)}
                  </span>
                </div>
                {/* Updated At */}
                <div>
                  <p className="text-muted-foreground">Last Updated At:</p>
                  <span className="font-medium text-foreground flex items-center">
                    {formatDate(category.updatedAt)}
                  </span>
                </div>
                {/* Description (spans two columns within this grid) */}
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Description:</p>
                  <span className="font-medium text-foreground">
                    {category.description || "N/A"}
                  </span>
                </div>
              </div>

              {/* Right Column - Category Image Section */}
              <div className="md:col-span-1 flex flex-col items-center p-4 border border-dashed rounded-md bg-muted/20">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5 text-secondary-foreground" />{" "}
                  Category Image
                </h3>
                {category.image ? (
                  <>
                    <div className="relative w-full h-48 sm:h-64 rounded-md overflow-hidden group mb-4">
                      <img
                        src={category.image.url}
                        alt={`Category image ${category.image.id}`}
                        className="object-cover w-full h-full"
                      />
                      {/* Overlay for actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              handleViewImageDetails(category.image?.id || "")
                            }
                            className="hover:bg-white/80"
                            disabled={loadingCategory}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              handleOpenDeleteImageDialog(
                                category.image?.id || ""
                              )
                            }
                            className="hover:bg-destructive/80"
                            disabled={loadingCategory || isDeleteImageLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Image type badges */}
                      <div className="absolute top-2 left-2 flex flex-col space-y-1">
                        {category.image.isHeroImage && (
                          <Badge className="bg-primary/80 text-white text-xs px-2 py-0.5">
                            Hero
                          </Badge>
                        )}
                        {category.image.isLogo && (
                          <Badge className="bg-blue-500/80 text-white text-xs px-2 py-0.5">
                            Logo
                          </Badge>
                        )}
                        {category.image.isIcon && (
                          <Badge className="bg-purple-500/80 text-white text-xs px-2 py-0.5">
                            Icon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center p-4 min-h-[150px] border border-dashed rounded-md text-muted-foreground bg-muted/20 mb-4">
                    <ImageIcon className="h-10 w-10 mb-2 text-muted-foreground/60" />
                    <span className="text-xs mb-3 text-center">
                      No image uploaded.
                    </span>
                  </div>
                )}
                {/* Always show upload button, but only if no image exists */}
                {!category.image && (
                  <Button
                    onClick={handleOpenUploadImageDialog}
                    size="sm"
                    className="hover:bg-primary w-full"
                    disabled={loadingCategory || isUploadImageLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Upload Image
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subcategories Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Subcategories ({subCategories?.length || 0})
            </h2>
            <Dialog
              open={isCreateSubCategoryDialogOpen}
              onOpenChange={(open) => {
                setIsCreateSubCategoryDialogOpen(open);
                if (!open) {
                  setIsCreatingSubCategory(false);
                  setCreateSubCategoryForm({
                    name: "",
                    description: "",
                    categoryId: categoryId,
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="hover:bg-primary"
                  onClick={() => setIsCreateSubCategoryDialogOpen(true)}
                  disabled={loadingSubCategories || isCreatingSubCategory}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Subcategory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubCategory} className="space-y-4">
                  <div>
                    <label
                      htmlFor="createSubCategoryName"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="createSubCategoryName"
                      type="text"
                      value={createSubCategoryForm.name}
                      onChange={(e) =>
                        setCreateSubCategoryForm({
                          ...createSubCategoryForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter subcategory name"
                      disabled={isCreatingSubCategory || loadingSubCategories}
                      required
                      maxLength={100} // Added maxLength for subcategory name
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="createSubCategoryDescription"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      Description
                    </label>
                    <Textarea
                      id="createSubCategoryDescription"
                      value={createSubCategoryForm.description}
                      onChange={(e) =>
                        setCreateSubCategoryForm({
                          ...createSubCategoryForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter subcategory description"
                      disabled={isCreatingSubCategory || loadingSubCategories}
                      rows={3}
                      maxLength={500} // Added maxLength for subcategory description
                    />
                  </div>
                  {/* Display current category as read-only */}
                  <div>
                    <label
                      htmlFor="createSubCategoryCategory"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      Parent Category
                    </label>
                    <Input
                      id="createSubCategoryCategory"
                      type="text"
                      value={category?.name || ""}
                      disabled
                      className="bg-muted-foreground/10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Subcategories are automatically linked to this category.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateSubCategoryDialogOpen(false)}
                      disabled={isCreatingSubCategory || loadingSubCategories}
                      className="hover:bg-primary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreatingSubCategory || loadingSubCategories}
                      className="hover:bg-primary"
                    >
                      {isCreatingSubCategory ? (
                        <div className="flex items-center">
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Creating...
                        </div>
                      ) : (
                        "Create Subcategory"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loadingSubCategories ? (
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-32" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-48" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-28" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : error && subCategories.length === 0 ? (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6">
                <div className="text-destructive-foreground text-center font-medium">
                  <Info className="h-8 w-8 mx-auto mb-3" />
                  <p>{error}</p>
                  {/* Re-fetch button could go here instead of Go Back if error is recoverable */}
                </div>
              </CardContent>
            </Card>
          ) : subCategories.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No subcategories found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first subcategory.
                  </p>
                  <Button
                    onClick={() => setIsCreateSubCategoryDialogOpen(true)}
                    className="hover:bg-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subCategories.map((subCat) => (
                      <TableRow key={subCat.id}>
                        <TableCell className="font-medium">
                          {subCat.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">
                          {subCat.description || "No description"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <span>{formatDate(subCat.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleViewSubCategoryDetails(subCat.id)
                              }
                              className="hover:bg-primary"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenEditSubCategoryDialog(subCat)
                              }
                              className="hover:bg-yellow-500 hover:text-white"
                            >
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleOpenDeleteSubCategoryDialog(subCat.id)
                              }
                              className="hover:bg-destructive/80"
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Upload Image Dialog */}
      <Dialog
        open={isUploadImageDialogOpen}
        onOpenChange={(open) => {
          setIsUploadImageDialogOpen(open);
          if (!open) {
            setIsUploadImageLoading(false);
            setUploadImageForm({
              image: null,
              categoryId: categoryId, // Reset to current category's ID
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Image for {category?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadImage} className="space-y-4">
            <div>
              <label
                htmlFor="uploadImageFile"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Image File <span className="text-destructive">*</span>
              </label>
              <Input
                id="uploadImageFile"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setUploadImageForm({
                    ...uploadImageForm,
                    image: e.target.files ? e.target.files[0] : null,
                  })
                }
                disabled={isUploadImageLoading || loadingCategory}
                required
              />
            </div>
            {/* Display message about automatic association with current category */}
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
              This image will be automatically associated with the current
              category:{" "}
              <span className="font-semibold text-foreground">
                {category?.name}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadImageDialogOpen(false)}
                disabled={isUploadImageLoading}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploadImageLoading}
                className="hover:bg-primary"
              >
                {isUploadImageLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Uploading...
                  </div>
                ) : (
                  "Upload Image"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Image Dialog */}
      <Dialog
        open={isDeleteImageDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteImageDialogOpen(open);
          if (!open) setImageToDeleteId(null); // Reset ID when closing
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Image Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this image? This action cannot be
              undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteImageDialogOpen(false)}
                disabled={isDeleteImageLoading}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteImage}
                disabled={isDeleteImageLoading}
              >
                {isDeleteImageLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Image
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Dialog */}
      <Dialog
        open={isEditSubCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsEditSubCategoryDialogOpen(open);
          if (!open) {
            setIsEditingSubCategory(false);
            setEditSubCategoryForm({ id: "", name: "", description: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubCategory} className="space-y-4">
            <div>
              <label
                htmlFor="editSubCategoryName"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="editSubCategoryName"
                type="text"
                value={editSubCategoryForm.name}
                onChange={(e) =>
                  setEditSubCategoryForm({
                    ...editSubCategoryForm,
                    name: e.target.value,
                  })
                }
                placeholder="Enter subcategory name"
                disabled={isEditingSubCategory}
                required
                maxLength={100} // Added maxLength for edit subcategory name
              />
            </div>
            <div>
              <label
                htmlFor="editSubCategoryDescription"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Description
              </label>
              <Textarea
                id="editSubCategoryDescription"
                value={editSubCategoryForm.description}
                onChange={(e) =>
                  setEditSubCategoryForm({
                    ...editSubCategoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Enter subcategory description"
                disabled={isEditingSubCategory}
                rows={3}
                maxLength={500} // Added maxLength for edit subcategory description
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditSubCategoryDialogOpen(false)}
                disabled={isEditingSubCategory}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditingSubCategory}
                className="hover:bg-primary"
              >
                {isEditingSubCategory ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory Dialog */}
      <Dialog
        open={isDeleteSubCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteSubCategoryDialogOpen(open);
          if (!open) setSubCategoryToDeleteId(null); // Reset ID when closing
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Subcategory Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this subcategory? This action
              cannot be undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteSubCategoryDialogOpen(false)}
                disabled={isDeletingSubCategory}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteSubCategory}
                disabled={isDeletingSubCategory}
                className="hover:bg-destructive/80"
              >
                {isDeletingSubCategory ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Subcategory
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryDetailsPage;
