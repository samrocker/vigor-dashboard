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
  FolderOpen, // For category main icon
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

// --- Type Definitions (UPDATED/REUSED) ---

// Updated SubCategory interface to include relations
interface SubCategoryDetails extends SubCategory {
  // Extends existing SubCategory
  category?: Category; // Optional, relation to parent category
  products?: Product[]; // Optional, array of associated products
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

// Image Type Definition (similar to ProductImage but for Category/General use)
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
    category: Category & { images?: CategoryImage[]; subCategories?: SubCategory[] }; // Add images array
  };
}

export interface SubCategoriesApiResponse extends ApiResponse {
  data: {
    subCategories: SubCategory[];
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
const CategoryDetailsPage = () => {
  const params = useParams();
  const categoryId = params.id as string;
  const router = useRouter();

  const [category, setCategory] = useState<(Category & { images?: CategoryImage[]; subCategories?: SubCategory[] }) | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image CRUD states (adapted for Category page)
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadImageForm, setUploadImageForm] = useState<{
    image: File | null; // Changed from imageFile to image
    categoryId: string | null; // Auto-associate with current category
  }>({
    image: null,
    categoryId: categoryId,
  });
  const [isUploadImageLoading, setIsUploadImageLoading] = useState(false);

  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);


  // Fetch category details and subcategories on component mount or categoryId change
  useEffect(() => {
    if (categoryId) {
      fetchCategoryDetails(categoryId);
      fetchSubCategories(categoryId);
    }
  }, [categoryId]);

  const fetchCategoryDetails = useCallback(async (id: string) => {
    setLoadingCategory(true);
    try {
      // Ensure 'images' and 'subCategories' relations are included
      const response = await axiosInstance.get<CategoryDetailsApiResponse>(
        `/public/category/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data) {
        setCategory(response.data.data.category);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch category details");
        setCategory(null);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching category details");
      setCategory(null);
      toast.error("Failed to load category details.");
    } finally {
      setLoadingCategory(false);
    }
  }, []);

  const fetchSubCategories = useCallback(async (id: string) => {
    setLoadingSubCategories(true);
    try {
      const response = await axiosInstance.get<SubCategoriesApiResponse>(
        `/public/category/${id}/sub-categories`
      );
      if (response.data.status === "success" && response.data.data) {
        setSubCategories(response.data.data.subCategories || []);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch subcategories");
        setSubCategories([]);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching subcategories");
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  }, []);


  const handleViewProductDetails = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  const handleViewSubCategoryDetails = (subCategoryId: string) => {
    router.push(`/admin/subcategories/${subCategoryId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/admin/images/${imageId}`);
  };


  // --- Image CRUD Handlers ---

  const handleOpenUploadImageDialog = () => {
    setUploadImageForm(prev => ({ ...prev, image: null, categoryId: categoryId })); // Reset and pre-set category ID
    setIsUploadImageDialogOpen(true);
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadImageLoading(true);
    setError(null);

    if (!uploadImageForm.image) { // Use 'image' here
      toast.error("Image file is required.");
      setIsUploadImageLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadImageForm.image); // Changed key to 'image'
    formData.append("categoryId", categoryId); // Always associate with the current category

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
          categoryId: categoryId,
        });
        fetchCategoryDetails(categoryId); // Re-fetch category details to update images list
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


  return (
    <div className="min-h-screen bg-background">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      {loadingCategory ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingSpinner className="h-12 w-12 text-primary" />
          <p className="ml-3 text-muted-foreground">Loading category details...</p>
        </div>
      ) : error && !category ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <Card className="border-destructive bg-destructive/10 w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-destructive-foreground text-center font-medium">
                <Info className="h-8 w-8 mx-auto mb-3" />
                <p>{error}</p>
                <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !category ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <Card className="border-border w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-center font-medium">
                <Info className="h-8 w-8 mx-auto mb-3" />
                <p>Category not found.</p>
                <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
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
                      {category.name}
                    </h1>
                    <p className="text-muted-foreground">
                      {category.description || "No description provided."}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="hover:bg-primary">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Categories
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Category Details Card */}
            <Card className="mb-8 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" /> Category Information
                </CardTitle>
                <CardDescription>Details about this category.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Category ID (visible for category details, removed from product/image table) */}
                <div>
                  <p className="text-muted-foreground">ID:</p>
                  <p className="font-medium text-foreground break-all">{category.id}</p>
                </div>
                {/* Name */}
                <div>
                  <p className="text-muted-foreground">Name:</p>
                  <p className="font-medium text-foreground">{category.name}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Description:</p>
                  <p className="font-medium text-foreground">{category.description || "N/A"}</p>
                </div>
                {/* Created At */}
                <div>
                  <p className="text-muted-foreground">Created At:</p>
                  <p className="font-medium text-foreground">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(category.createdAt)}
                  </p>
                </div>
                {/* Updated At */}
                <div>
                  <p className="text-muted-foreground">Last Updated At:</p>
                  <p className="font-medium text-foreground">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(category.updatedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Category Images Card */}
            <Card className="mb-8 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-secondary-foreground" /> Category Images
                </CardTitle>
                <Button onClick={handleOpenUploadImageDialog} size="sm" className="hover:bg-primary">
                    <Plus className="h-4 w-4 mr-2" /> Upload Image
                </Button>
              </CardHeader>
              <CardContent>
                {category.images && category.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {category.images.map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border border-border group">
                        <img src={image.url} alt={`Category image ${image.id}`} className="object-cover w-full h-full" />
                        {/* Overlay for actions */}
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex space-x-2">
                                <Button variant="secondary" size="icon" onClick={() => handleViewImageDetails(image.id)} className="hover:bg-white/80">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                {/* Edit button removed */}
                                <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteImageDialog(image.id)} className="hover:bg-destructive/80">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {/* Optional: Display image type badges here if desired, outside the hover overlay */}
                        <div className="absolute top-2 left-2 flex flex-col space-y-1">
                            {image.isHeroImage && <Badge className="bg-primary/80 text-white text-xs px-2 py-0.5">Hero</Badge>}
                            {image.isLogo && <Badge className="bg-blue-500/80 text-white text-xs px-2 py-0.5">Logo</Badge>}
                            {image.isIcon && <Badge className="bg-purple-500/80 text-white text-xs px-2 py-0.5">Icon</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-4">No images found for this category.</div>
                )}
              </CardContent>
            </Card>

            {/* Subcategories Section */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Subcategories</h2>
              {/* Create Subcategory Dialog - existing code */}
              <Dialog
                // open={isCreateSubCategoryDialogOpen} // Uncomment and manage this state if you need to open dialog from here
                // onOpenChange={setIsCreateSubCategoryDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="hover:bg-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                </DialogTrigger>
                {/* Dialog Content for creating subcategory would go here */}
                {/* You'd need to bring over the create subcategory dialog from AllCategoryPage.tsx */}
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Subcategory</DialogTitle>
                    </DialogHeader>
                    {/* Simplified form for placeholder; integrate your actual subcategory form here */}
                    <p className="text-muted-foreground">Subcategory creation form goes here.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {/* Close dialog */}} className="hover:bg-primary">Cancel</Button>
                        <Button type="submit" className="hover:bg-primary">Create</Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingSubCategories ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner className="h-6 w-6 text-primary" />
                <p className="ml-3 text-muted-foreground">Loading subcategories...</p>
              </div>
            ) : error && subCategories.length === 0 ? ( // Display error if no subcategories and there's an error
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="text-destructive-foreground text-center font-medium">
                    <Info className="h-8 w-8 mx-auto mb-3" />
                    <p>{error}</p>
                    <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
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
                    <Button onClick={() => {/* Open subcategory create dialog */}} className="hover:bg-primary">
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
                              <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                              <span>{formatDate(subCat.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSubCategoryDetails(subCat.id)}
                                className="hover:bg-primary"
                              >
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                              {/* Edit and Delete Subcategory buttons will be here, similar to AllCategoryPage */}
                              {/* These should also be implemented from AllCategoryPage */}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upload Image Dialog */}
          <Dialog open={isUploadImageDialogOpen} onOpenChange={(open) => {
            setIsUploadImageDialogOpen(open);
            if (!open) {
              setIsUploadImageLoading(false);
              setUploadImageForm({
                image: null,
                categoryId: categoryId, // Reset to current category's ID
              });
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New Image for {category?.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadImage} className="space-y-4">
                <div>
                  <label htmlFor="uploadImageFile" className="block text-sm font-medium text-foreground mb-1">
                    Image File <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="uploadImageFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadImageForm({ ...uploadImageForm, image: e.target.files ? e.target.files[0] : null })}
                    disabled={isUploadImageLoading}
                    required
                  />
                </div>
                {/* Display message about automatic association with current category */}
                <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                    This image will be automatically associated with the current category: <span className="font-semibold text-foreground">{category?.name}</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsUploadImageDialogOpen(false)} disabled={isUploadImageLoading} className="hover:bg-primary">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploadImageLoading} className="hover:bg-primary">
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
          <Dialog open={isDeleteImageDialogOpen} onOpenChange={(open) => {
            setIsDeleteImageDialogOpen(open);
            if (!open) setIsDeleteImageLoading(false);
          }}>
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
                  <Button type="button" variant="outline" onClick={() => setIsDeleteImageDialogOpen(false)} disabled={isDeleteImageLoading} className="hover:bg-primary">
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmDeleteImage} disabled={isDeleteImageLoading}>
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
        </>
      )}
    </div>
  );
};

export default CategoryDetailsPage;