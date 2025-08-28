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
  Plus, // For add image
  Trash2, // For delete image
  ImageIcon, // For images section
  Edit, // For edit action
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

// --- Type Definitions ---

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
}

// Image Type Definition for SubCategory
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
      category?: Category;
    };
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

  // State for changing the subcategory image
  const [isChangeImageDialogOpen, setIsChangeImageDialogOpen] = useState(false);
  const [changeImageForm, setChangeImageForm] = useState<{ image: File | null }>({
    image: null,
  });
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);

  // State for deleting the image
  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);

  // --- Data Fetching ---

  const fetchSubCategoryDetails = useCallback(
    async (id: string) => {
      setLoadingSubCategory(true);
      try {
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
    []
  );

  useEffect(() => {
    if (subCategoryId) {
      fetchSubCategoryDetails(subCategoryId);
    }
  }, [subCategoryId, fetchSubCategoryDetails]);

  // --- Navigation Handlers ---

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/image/${imageId}`);
  };

  // --- Image CRUD Handlers ---

  const handleOpenChangeImageDialog = () => {
    setChangeImageForm({ image: null }); // Reset form
    setIsChangeImageDialogOpen(true);
  };

  const handleUpdateSubCategoryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingImage(true);

    if (!changeImageForm.image) {
      toast.error("An image file is required.");
      setIsUpdatingImage(false);
      return;
    }

    try {
      // Step 1: Upload the image
      const formData = new FormData();
      formData.append("image", changeImageForm.image);

      const imageUploadResponse = await axiosInstance.post(
        "/admin/image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (imageUploadResponse.data.status !== "success" || !imageUploadResponse.data.data?.image?.id) {
        throw new Error(imageUploadResponse.data.message || "Failed to upload image.");
      }

      const newImageId = imageUploadResponse.data.data.image.id;
      toast.info("Image uploaded, now updating subcategory...");

      // Step 2: Update the subcategory with the new imageId
      const subCategoryUpdateResponse = await axiosInstance.patch(
        `/admin/sub-category/${subCategoryId}`,
        {
          imageId: newImageId,
          name: subCategory?.name,
          description: subCategory?.description || "",
        }
      );

      if (subCategoryUpdateResponse.data.status === "success") {
        toast.success("Subcategory image updated successfully!");
        setIsChangeImageDialogOpen(false);
        fetchSubCategoryDetails(subCategoryId); // Refresh data
      } else {
        throw new Error(subCategoryUpdateResponse.data.message || "Failed to link image.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingImage(false);
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
        fetchSubCategoryDetails(subCategoryId);
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
        className="min-h-screen bg-background p-4 w-full"
      >
        <div className="max-w-7xl mx-auto py-8 w-full">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                ))}
              </div>
              <div className="md:col-span-1 p-4">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="w-full h-56 rounded-md mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          <div className="mb-4">
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (!subCategory) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex items-center justify-center bg-background p-4"
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Info className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="text-lg">Subcategory not found.</p>
            <Button onClick={() => router.back()} className="mt-4" variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-muted">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{subCategory.name}</h1>
              <p className="text-muted-foreground">
                {subCategory.description || "No description provided."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/subcategory")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subcategories
          </Button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Subcategory Information
              </CardTitle>
              <CardDescription>
                Details and properties of this subcategory.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID:</p>
                  <span className="font-mono text-xs">{subCategory.id}</span>
                </div>
                <div>
                  <p className="text-muted-foreground">Name:</p>
                  <span className="font-medium">{subCategory.name}</span>
                </div>
                <div>
                  <p className="text-muted-foreground">Parent Category:</p>
                  <span className="font-medium">{subCategory.category?.name || "N/A"}</span>
                </div>
                <div>
                  <p className="text-muted-foreground">Created:</p>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    {formatDate(subCategory.createdAt)}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated:</p>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    {formatDate(subCategory.updatedAt)}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Description:</p>
                  <p>{subCategory.description || "N/A"}</p>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-col items-center p-4 border border-dashed rounded-md bg-muted/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5" />
                  Image
                </h3>
                {subCategory.image ? (
                  <div className="relative w-full h-56 rounded-md overflow-hidden group mb-4">
                    <img src={subCategory.image.url} alt={subCategory.name} className="object-cover w-full h-full" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-2">
                        <Button variant="secondary" size="icon" onClick={() => handleViewImageDetails(subCategory.image!.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={handleOpenChangeImageDialog}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteImageDialog(subCategory.image!.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center p-4 h-56 flex flex-col justify-center items-center bg-muted/50 rounded-md mb-4">
                    <ImageIcon className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No image uploaded.</p>
                  </div>
                )}
                <Button onClick={handleOpenChangeImageDialog} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {subCategory.image ? "Change Image" : "Upload Image"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-xl font-bold mb-4">
            Products ({subCategory.products?.length || 0})
          </h2>
          <Card>
            <CardContent className="p-0">
              {subCategory.products && subCategory.products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subCategory.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{product.description || "N/A"}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(product.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleViewProductDetails(product.id)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No products found</h3>
                  <p className="text-muted-foreground">This subcategory does not have any products yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialog for Changing/Uploading Image */}
      <Dialog open={isChangeImageDialogOpen} onOpenChange={setIsChangeImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subCategory.image ? "Change" : "Upload"} Image for {subCategory.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubCategoryImage} className="space-y-4">
            <div>
              <label htmlFor="imageFile" className="block text-sm font-medium mb-1">
                Image File <span className="text-destructive">*</span>
              </label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => setChangeImageForm({ image: e.target.files ? e.target.files[0] : null })}
                disabled={isUpdatingImage}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChangeImageDialogOpen(false)} disabled={isUpdatingImage}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingImage}>
                {isUpdatingImage ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Image"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Deleting Image */}
      <Dialog open={isDeleteImageDialogOpen} onOpenChange={setIsDeleteImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Image Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this image? This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteImageDialogOpen(false)} disabled={isDeleteImageLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteImage} disabled={isDeleteImageLoading}>
              {isDeleteImageLoading ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Image"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubCategoryDetailsPage;