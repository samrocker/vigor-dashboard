// app/admin/subcategories/[id]/page.tsx
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
  DollarSign, // For product price
  Plus, // For add image
  Trash2, // For delete image
  ImageIcon, // For images section
  CheckCircle, // For true boolean status
  XCircle, // For false boolean status
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Keeping for consistency, though not used for image forms

// --- Type Definitions (UPDATED/REUSED) ---

// Updated SubCategory interface to include relations
interface SubCategoryDetails extends SubCategory {
  // Extends existing SubCategory
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
    }; // Change images array to single image object
  };
}

// --- Utility Functions ---
function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const [subCategory, setSubCategory] = useState<
    (SubCategory & { products?: Product[]; image?: SubCategoryImage }) | null
  >(null);
  const [loadingSubCategory, setLoadingSubCategory] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchSubCategoryDetails = useCallback(async (id: string) => {
    setLoadingSubCategory(true);
    try {
      // Include 'products' and 'images' relations
      const response = await axiosInstance.get<SubCategoryDetailsApiResponse>(
        `/public/sub-category/${id}?includeRelations=true`
      );
      if (
        response.data.status === "success" &&
        response.data.data?.subCategory
      ) {
        setSubCategory(response.data.data.subCategory);
        setError(null);
      } else {
        setError(
          response.data.message || "Failed to fetch subcategory details."
        );
        setSubCategory(null);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred while fetching subcategory details."
      );
      setSubCategory(null);
      toast.error("Failed to load subcategory details.");
    } finally {
      setLoadingSubCategory(false);
    }
  }, []);

  const handleViewProductDetails = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/admin/images/${imageId}`);
  };

  // --- Image CRUD Handlers ---

  const handleOpenUploadImageDialog = () => {
    setUploadImageForm((prev) => ({
      ...prev,
      image: null,
      subCategoryId: subCategoryId,
    })); // Reset and pre-set subcategory ID
    setIsUploadImageDialogOpen(true);
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadImageLoading(true);
    setError(null);

    if (!uploadImageForm.image) {
      // Use 'image' here
      toast.error("Image file is required.");
      setIsUploadImageLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadImageForm.image); // Changed key to 'image' for API payload
    formData.append("subCategoryId", subCategoryId); // Always associate with the current subcategory

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
          image: null, // Use 'image' here
          subCategoryId: subCategoryId,
        });
        fetchSubCategoryDetails(subCategoryId); // Re-fetch subcategory details to update images list
      } else {
        toast.error(response.data.message || "Failed to upload image.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
      toast.error(err.response?.data?.message || "Error uploading image.");
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
        fetchSubCategoryDetails(subCategoryId); // Re-fetch subcategory details to update images list
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

  if (loadingSubCategory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">
          Loading subcategory details...
        </p>
      </div>
    );
  }

  if (error && !subCategory) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
      </div>
    );
  }

  if (!subCategory) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Header Section */}
      <div className="border-b border-border">
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
                <p className="text-muted-foreground">
                  {subCategory.description || "No description provided."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="hover:bg-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subcategories
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SubCategory Information Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> SubCategory Information
            </CardTitle>
            <CardDescription>
              Comprehensive details about this subcategory.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* SubCategory ID */}
            <div>
              <p className="text-muted-foreground">ID:</p>
              <p className="font-medium text-foreground break-all">
                {subCategory.id}
              </p>
            </div>
            {/* Name */}
            <div>
              <p className="text-muted-foreground">Name:</p>
              <p className="font-medium text-foreground">{subCategory.name}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Description:</p>
              <p className="font-medium text-foreground">
                {subCategory.description || "N/A"}
              </p>
            </div>
            {/* Parent Category */}
            {/* You might want to fetch and display the parent category name here */}
            {/* For now, assuming direct subcategory only. If parent category is needed,
                you'd need state and a fetch for it, similar to image details page. */}
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(subCategory.createdAt)}
              </p>
            </div>
            {/* Updated At */}
            <div>
              <p className="text-muted-foreground">Last Updated At:</p>
              <p className="font-medium text-foreground">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(subCategory.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SubCategory Images Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-secondary-foreground" />{" "}
              SubCategory Images
            </CardTitle>
            <Button
              onClick={handleOpenUploadImageDialog}
              size="sm"
              className="hover:bg-primary"
            >
              <Plus className="h-4 w-4 mr-2" /> Upload Image
            </Button>
          </CardHeader>
          <CardContent>
            {subCategory.image ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  key={subCategory.image.id}
                  className="relative aspect-square rounded-md overflow-hidden border border-border group"
                >
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
                        onClick={() => handleViewImageDetails(subCategory.image!.id)}
                        className="hover:bg-white/80"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleOpenDeleteImageDialog(subCategory.image!.id)}
                        className="hover:bg-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Optional: Display image type badges here if desired, outside the hover overlay */}
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
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-4">
                No images found for this subcategory.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Section (Products belonging to this subcategory) */}
        {/* The products table logic should already be here from your initial SubCategoryDetailsPage */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">
            Products in this Subcategory
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
                <p className="text-muted-foreground mb-4">
                  Add products directly or through the product management page.
                </p>
                {/* Optional: Add button to create product for this subcategory */}
                {/* <Button onClick={() => router.push(`/admin/products/new?subCategoryId=${subCategoryId}`)} className="hover:bg-primary">
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Button> */}
              </div>
            </CardContent>
          </Card>
        )}
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
                disabled={isUploadImageLoading}
                required
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
