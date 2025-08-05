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
  FolderOpen, // For subcategory main icon
  Info, // General information
  Calendar, // For dates
  ArrowLeft, // For back button
  Package, // For products section
  Eye, // For view product details
  DollarSign, // For product price (not used but kept for completeness if future need)
  Plus, // For add image
  Trash2, // For delete image
  ImageIcon, // For images section
  CheckCircle, // For true boolean status (not used but kept for completeness)
  XCircle, // For false boolean status (not used but kept for completeness)
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions (UPDATED/REUSED) ---

// Updated SubCategory interface to include relations
interface SubCategoryDetails extends SubCategory {
  category?: Category; // Optional, relation to parent category
  products?: Product[]; // Optional, array of associated products
  image?: SubCategoryImage; // Optional, single image associated with subcategory
}

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
  // Add other fields from product API response if needed, e.g., imageUrl, additionalDetails
}

// Image Type Definition (similar to ProductImage/CategoryImage but for SubCategory)
interface SubCategoryImage {
  id: string;
  url: string;
  isHeroImage: boolean;
  isLogo: boolean;
  isIcon: boolean;
  productId: string | null;
  categoryId: string | null;
  subCategoryId: string | null; // This will be used for association
  blogId: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Response for single subcategory with relations
export interface SubCategoryDetailsApiResponse extends ApiResponse {
  data: {
    subCategory: SubCategory & {
      products?: Product[];
      image?: SubCategoryImage;
      category?: Category; // Add category relation here
    }; // Change images array to single image object
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
const SubCategoryDetailsPage = () => {
  const params = useParams();
  const subCategoryId = params.id as string;
  const router = useRouter();

  const [subCategory, setSubCategory] = useState<SubCategoryDetails | null>(
    null
  );
  const [loadingSubCategory, setLoadingSubCategory] = useState(true);

  // Image CRUD states (adapted for SubCategory page)
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadImageForm, setUploadImageForm] = useState<{
    image: File | null;
    subCategoryId: string | null; // Auto-associate with current subcategory
  }>({
    image: null,
    subCategoryId: subCategoryId,
  });
  const [isUploadImageLoading, setIsUploadImageLoading] = useState(false);

  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);

  // Fetch subcategory details on component mount or subCategoryId change
  useEffect(() => {
    if (subCategoryId) {
      fetchSubCategoryDetails(subCategoryId);
    }
  }, [subCategoryId]);

  const fetchSubCategoryDetails = useCallback(
    async (id: string) => {
      setLoadingSubCategory(true);
      try {
        // Include 'products', 'image', and 'category' relations
        const response = await axiosInstance.get<SubCategoryDetailsApiResponse>(
          `/public/sub-category/${id}?includeRelations=true`
        );
        if (
          response.data.status === "success" &&
          response.data.data?.subCategory
        ) {
          setSubCategory(response.data.data.subCategory);
        } else {
          toast.error(
            response.data.message || "Failed to fetch subcategory details."
          );
          setSubCategory(null);
        }
      } catch (err: any) {
        toast.error(
          err.message ||
            "An unexpected error occurred while fetching subcategory details."
        );
        setSubCategory(null);
      } finally {
        setLoadingSubCategory(false);
      }
    },
    [] // Empty dependency array, subCategoryId comes from useParams
  );

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/image/${imageId}`);
  };

  // --- Image CRUD Handlers ---

  const handleOpenUploadImageDialog = () => {
    setUploadImageForm((prev) => ({
      ...prev,
      image: null,
      subCategoryId: subCategoryId,
    }));
    setIsUploadImageDialogOpen(true);
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadImageLoading(true);

    if (!uploadImageForm.image) {
      toast.error("Image file is required.");
      setIsUploadImageLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadImageForm.image);
    formData.append("subCategoryId", subCategoryId);

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
          subCategoryId: subCategoryId,
        });
        fetchSubCategoryDetails(subCategoryId); // Re-fetch subcategory details to update images list
      } else {
        toast.error(response.data.message || "Failed to upload image.");
      }
    } catch (err: any) {
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
    try {
      const response = await axiosInstance.delete(
        `/admin/image/${imageToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Image deleted successfully!");
        setIsDeleteImageDialogOpen(false);
        setImageToDeleteId(null);
        fetchSubCategoryDetails(subCategoryId); // Re-fetch subcategory details to update images list
      } else {
        toast.error(response.data.message || "Failed to delete image.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error deleting image.");
    } finally {
      setIsDeleteImageLoading(false);
    }
  };

  const handleOpenDeleteImageDialog = (imageId: string) => {
    setImageToDeleteId(imageId);
    setIsDeleteImageDialogOpen(true);
  };

  // --- Render Loading/Error/Not Found States ---
  if (loadingSubCategory) {
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
          {/* SubCategory Information Card Skeleton */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(5)].map((_, idx) => (
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

          {/* Products Section Skeleton */}
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
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-48" />{" "}
                      {/* Wider for Description */}
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
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
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Skeleton for "No products found" state if applicable */}
              <div className="text-center py-12">
                <Skeleton className="h-12 w-12 mx-auto mb-4" />
                <Skeleton className="h-6 w-64 mx-auto mb-2" />
                <Skeleton className="h-4 w-80 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // If not loading and no subCategory found (e.g., invalid ID)
  if (!subCategory) {
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
              <p>Subcategory not found.</p>
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
                  {subCategory.name}
                </h1>
                <span className="text-muted-foreground">
                  {subCategory.description || "No description provided."}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/subcategory")}
              className="hover:bg-primary"
              disabled={loadingSubCategory}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subcategories
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SubCategory Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> SubCategory
                Information
              </CardTitle>
              <CardDescription>
                Comprehensive details about this subcategory.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Left Column - SubCategory Details */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SubCategory ID */}
                <div>
                  <p className="text-muted-foreground">ID:</p>
                  <span className="font-medium text-foreground break-all">
                    {subCategory.id}
                  </span>
                </div>
                {/* Name */}
                <div>
                  <p className="text-muted-foreground">Name:</p>
                  <span className="font-medium text-foreground">
                    {subCategory.name}
                  </span>
                </div>
                {/* Parent Category */}
                <div>
                  <p className="text-muted-foreground">Parent Category:</p>
                  <span className="font-medium text-foreground">
                    {subCategory.category?.name || "N/A"}
                  </span>
                </div>
                {/* Created At */}
                <div>
                  <p className="text-muted-foreground">Created At:</p>
                  <span className="font-medium text-foreground flex items-center">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(subCategory.createdAt)}
                  </span>
                </div>
                {/* Updated At */}
                <div>
                  <p className="text-muted-foreground">Last Updated At:</p>
                  <span className="font-medium text-foreground flex items-center">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(subCategory.updatedAt)}
                  </span>
                </div>
                {/* Description (spans two columns within this grid) */}
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Description:</p>
                  <span className="font-medium text-foreground">
                    {subCategory.description || "N/A"}
                  </span>
                </div>
              </div>

              {/* Right Column - SubCategory Image Section */}
              <div className="md:col-span-1 flex flex-col items-center p-4 border border-dashed rounded-md bg-muted/20">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5 text-secondary-foreground" />{" "}
                  SubCategory Image
                </h3>
                {subCategory.image ? (
                  <>
                    <div className="relative w-full h-48 sm:h-64 rounded-md overflow-hidden group mb-4">
                      <img
                        src={subCategory.image.url}
                        alt={`Subcategory image ${subCategory.image.id}`}
                        className="object-cover w-full h-full"
                      />
                      {/* Overlay for actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              handleViewImageDetails(
                                subCategory.image?.id || ""
                              )
                            }
                            className="hover:bg-white/80"
                            disabled={loadingSubCategory}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              handleOpenDeleteImageDialog(
                                subCategory.image?.id || ""
                              )
                            }
                            className="hover:bg-destructive/80"
                            disabled={
                              loadingSubCategory || isDeleteImageLoading
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Image type badges */}
                      <div className="absolute top-2 left-2 flex flex-col space-y-1">
                        {subCategory.image.isHeroImage && (
                          <Badge className="bg-primary/80 text-white text-xs px-2 py-0.5">
                            Hero
                          </Badge>
                        )}
                        {subCategory.image.isLogo && (
                          <Badge className="bg-blue-500/80 text-white text-xs px-2 py-0.5">
                            Logo
                          </Badge>
                        )}
                        {subCategory.image.isIcon && (
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
                {!subCategory.image && (
                  <Button
                    onClick={handleOpenUploadImageDialog}
                    size="sm"
                    className="hover:bg-primary w-full"
                    disabled={loadingSubCategory || isUploadImageLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Upload Image
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Section (Products belonging to this subcategory) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Products in this Subcategory ({subCategory.products?.length || 0}
              )
            </h2>
            {/* Add Product button for this subcategory could go here */}
            {/* Example: <Button size="sm" onClick={() => router.push(`/admin/products/new?subCategoryId=${subCategoryId}`)}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button> */}
          </div>
          {subCategory.products && subCategory.products.length > 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Description</TableHead>{" "}
                      {/* Added Description */}
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subCategory.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {product.description || "N/A"}
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              product.stock === 0
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(product.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProductDetails(product.id)}
                            className="hover:bg-primary"
                            disabled={loadingSubCategory}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Product
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No products found for this subcategory.
                  </h3>
                  <span className="text-muted-foreground mb-4">
                    Add products directly or through the product management
                    page.
                  </span>
                  {/* Optional: Add button to create product for this subcategory */}
                  {/* <Button onClick={() => router.push(`/admin/products/new?subCategoryId=${subCategoryId}`)} className="hover:bg-primary">
                    <Plus className="h-4 w-4 mr-2" /> Add Product
                  </Button> */}
                </div>
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
              subCategoryId: subCategoryId, // Reset to current subcategory's ID
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Image for {subCategory?.name}</DialogTitle>
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
                disabled={isUploadImageLoading || loadingSubCategory}
                required
                maxLength={255} // Max length for file path/name if it were a text input. For file inputs, this controls the visible length of the selected file name.
              />
            </div>
            {/* Display message about automatic association with current subcategory */}
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
              This image will be automatically associated with the current
              subcategory:{" "}
              <span className="font-semibold text-foreground">
                {subCategory?.name}
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
          if (!open) setIsDeleteImageLoading(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
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
    </div>
  );
};

export default SubCategoryDetailsPage;