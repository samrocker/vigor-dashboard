// app/admin/products/[id]/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiResponse, axiosInstance } from "@/lib/axios";
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
  Package, // Main product icon
  Info, // General info
  Calendar, // Dates
  ArrowLeft, // Back button
  DollarSign, // Price
  Boxes, // Stock
  CheckCircle, // COD enabled
  XCircle, // For COD disabled status
  ImageIcon, // For images section
  Type, // For product variants
  ShoppingCart, // For cart items
  ListOrdered, // For order items
  MessageSquare, // For reviews
  Star, // For review rating
  FolderOpen, // For subcategory
  Eye, // For view details
  Plus, // For add button
  Trash2, // For delete button
  HardDrive, // For associations (in Image CRUD - mostly removed for this page)
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
import { Textarea } from "@/components/ui/textarea"; // Still keeping, might be used elsewhere
import { Checkbox } from "@/components/ui/checkbox"; // Still keeping, might be used elsewhere
import {
  Select, // Still keeping, might be used elsewhere if any select remains
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// --- Type Definitions (Comprehensive for Product Details Page) ---

interface AdditionalDetails {
  [key: string]: string; // Changed to string as values will be input as strings
}

// Product interface for fetching product names for related items
interface ProductForRelatedItemDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

// Variant interface for fetching variant names for related items
interface VariantForRelatedItemDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

interface CartItem { // Simplified for display on this page
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem { // Simplified for display on this page
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string; // From order item direct payload
  productDetails: { [key: string]: any }; // From order item direct payload
  createdAt: string;
  updatedAt: string;
}

interface ProductImage { // ENSURE THIS IS PRESENT AND CORRECT
  id: string;
  url: string;
  isHeroImage: boolean;
  isLogo: boolean;
  isIcon: boolean;
  productId: string | null; // Important for checking association
  categoryId: string | null;
  subCategoryId: string | null;
  blogId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string }; // e.g., { color: "black", size: "M" }
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string | null;
  // ... other subCategory fields if needed
}

// Main Product interface for details page, including all relations
export interface ProductDetails {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: AdditionalDetails;
  price: number;
  COD: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
  cartItems?: CartItem[];
  orderItems?: OrderItem[];
  images?: ProductImage[]; // ENSURE THIS IS INCLUDED
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  subCategory?: SubCategory; // Full subCategory object
}

// API Response for specific product with relations
interface ProductDetailsApiResponse extends ApiResponse {
  data: {
    product: ProductDetails;
  };
}

// For filter/form dropdown options (re-used from AllImagesPage)
// No longer needed for *this* page's image upload, but might be for other CRUD parts
interface EntityOption {
  id: string;
  name: string; // Or some displayable property
}

// --- Utility Functions ---
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

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

// --- Component ---
const ProductDetailsPage = () => {
  const params = useParams();
  const productId = params.id as string;
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for related product/variant details within cart/order items
  const [relatedProductDetailsMap, setRelatedProductDetailsMap] = useState<Map<string, ProductForRelatedItemDetails>>(new Map());
  const [relatedVariantDetailsMap, setRelatedVariantDetailsMap] = useState<Map<string, VariantForRelatedItemDetails>>(new Map());
  const [loadingRelatedItems, setLoadingRelatedItems] = useState<boolean>(false);

  // Image CRUD states (adapted for this page's specific needs)
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadImageForm, setUploadImageForm] = useState<{
    image: File | null; // Changed from imageFile
    productId: string | null;
    // other association IDs are fixed for product page upload
  }>({
    image: null,
    productId: productId, // Auto-associate with current product
  });
  const [isUploadImageLoading, setIsUploadImageLoading] = useState(false);


  // Removed edit image dialog states and related variables
  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);

  // Removed entity options as they are not needed for association selection on this page
  // The current product ID will be used implicitly
  const [filterOptionsSearchQuery, setFilterOptionsSearchQuery] = useState(""); // Still keeping, might be used for other CRUDs if added


  // --- Fetch Product Details ---
  const fetchProductDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ProductDetailsApiResponse>(
        // Ensure 'images' relation is included here
        `/public/product/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.product) {
        setProduct(response.data.data.product);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch product details.");
        setProduct(null);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching product details.");
      setProduct(null);
      toast.error("Failed to load product details.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Removed fetchEntityOptions as it's no longer needed for image association on this page

  useEffect(() => {
    if (productId) {
      fetchProductDetails(productId);
      // Removed fetchEntityOptions call from here
    }
  }, [productId, fetchProductDetails]);

  // Effect to fetch details for products/variants within cartItems and orderItems
  useEffect(() => {
    const fetchRelatedItemDetails = async () => {
      setLoadingRelatedItems(true);
      const uniqueProductIds = new Set<string>();
      const uniqueVariantIds = new Set<string>();

      // Collect IDs from cart items
      product?.cartItems?.forEach(item => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });

      // Collect IDs from order items
      product?.orderItems?.forEach(item => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });

      const newProductDetails = new Map<string, ProductForRelatedItemDetails>();
      const newVariantDetails = new Map<string, VariantForRelatedItemDetails>();

      const productPromises = Array.from(uniqueProductIds).map(async (pId) => {
        try {
          const response = await axiosInstance.get<ApiResponse<{ product: ProductForRelatedItemDetails }>>(
            `/public/product/${pId}?includeRelations=true`
          );
          if (response.data.status === "success" && response.data.data?.product) {
            newProductDetails.set(pId, response.data.data.product);
          }
        } catch (err) {
          console.error(`Failed to fetch related product ${pId}:`, err);
        }
      });

      const variantPromises = Array.from(uniqueVariantIds).map(async (vId) => {
        try {
          const response = await axiosInstance.get<ApiResponse<{ variant: VariantForRelatedItemDetails }>>(
            `/public/variant/${vId}?includeRelations=true`
          );
          if (response.data.status === "success" && response.data.data?.variant) {
            newVariantDetails.set(vId, response.data.data.variant);
          }
        } catch (err) {
          console.error(`Failed to fetch related variant ${vId}:`, err);
        }
      });

      await Promise.all([...productPromises, ...variantPromises]);

      setRelatedProductDetailsMap(newProductDetails);
      setRelatedVariantDetailsMap(newVariantDetails);
      setLoadingRelatedItems(false);
    };

    if (product && (product.cartItems || product.orderItems)) { // Only fetch if product data and related items exist
      fetchRelatedItemDetails();
    } else if (product) { // If product exists but has no items, stop loading related details
      setLoadingRelatedItems(false);
    }
  }, [product?.cartItems, product?.orderItems]);


  // --- Navigation Handlers ---
  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  const handleViewUserDetails = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/admin/variants/${variantId}`);
  };

  const handleViewCartDetails = (cartId: string) => {
    router.push(`/admin/carts/${cartId}`);
  };

  const handleViewImageDetails = (imageId: string) => {
    router.push(`/admin/images/${imageId}`);
  }

  // --- Image CRUD Handlers (Adapted for this ProductDetailsPage) ---

  const handleOpenUploadImageDialog = () => {
    // Reset form and pre-set product ID for association
    setUploadImageForm({
      image: null,
      productId: productId,
    });
    setIsUploadImageDialogOpen(true);
    // No need to clear filterOptionsSearchQuery here as productOptions are not displayed
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
    formData.append("imageFile", uploadImageForm.image); // API expects 'imageFile'

    // Always associate with the current product for this page's upload
    formData.append("productId", productId);


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
          productId: productId, // Reset to current product's ID
        });
        fetchProductDetails(productId); // Re-fetch product details to update images list
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

  // Removed handleOpenEditImageDialog and handleUpdateImage

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
        fetchProductDetails(productId); // Re-fetch product details to update images list
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

  // Helper to filter options for select dropdowns (No longer directly used for association selects in dialogs)
  // Keeping it as it might be relevant for other filter uses on product page
  const getFilteredOptions = (options: EntityOption[]) => {
    if (!filterOptionsSearchQuery) {
      return options;
    }
    const lowerCaseQuery = filterOptionsSearchQuery.toLowerCase();
    return options.filter(option =>
      option.name.toLowerCase().includes(lowerCaseQuery) ||
      option.id.toLowerCase().includes(lowerCaseQuery)
    );
  };

  // --- Render Loading/Error/Not Found States ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
              <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Product not found.</p>
              <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-background">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      {/* Header Section */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {product.name}
                </h1>
                <p className="text-muted-foreground">
                  Product ID: {product.id} {/* Retaining ID here for product details page clarity */}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="hover:bg-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Information Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Product Information
            </CardTitle>
            <CardDescription>Comprehensive details about this product.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Name */}
            <div>
              <p className="text-muted-foreground">Name:</p>
              <p className="font-medium text-foreground">{product.name}</p>
            </div>
            {/* Price */}
            <div>
              <p className="text-muted-foreground">Price:</p>
              <p className="font-medium text-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                {formatCurrency(product.price)}
              </p>
            </div>
            {/* Stock */}
            <div>
              <p className="text-muted-foreground">Stock:</p>
              <Badge className={product.stock === 0 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
                {product.stock} units
              </Badge>
            </div>
            {/* COD Status */}
            <div>
              <p className="text-muted-foreground">Cash on Delivery:</p>
              <Badge className={product.COD ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {product.COD ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {/* SubCategory */}
            <div>
              <p className="text-muted-foreground">SubCategory:</p>
              <p className="font-medium text-foreground flex items-center">
                <FolderOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                {product.subCategory?.name || "N/A"}
                {product.subCategory?.id && (
                  <span className="text-xs text-muted-foreground ml-2">({product.subCategory.id.substring(0, 4)}...)</span>
                )}
              </p>
            </div>
            {/* Description */}
            <div className="lg:col-span-3">
              <p className="text-muted-foreground">Description:</p>
              <p className="font-medium text-foreground">
                {product.description || "N/A"}
              </p>
            </div>
            {/* Additional Details */}
            {product.additionalDetails && Object.keys(product.additionalDetails).length > 0 && (
              <div className="lg:col-span-3">
                <p className="text-muted-foreground mb-2">Additional Details:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(product.additionalDetails).map(([key, value]) => (
                    <React.Fragment key={key}>
                      <p className="text-muted-foreground capitalize font-semibold">{key}:</p>
                      <p className="font-medium text-foreground">{String(value)}</p>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
            {/* Created At */}
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(product.createdAt)}
              </p>
            </div>
            {/* Updated At */}
            <div>
              <p className="text-muted-foreground">Last Updated At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(product.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Images Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-secondary-foreground" /> Product Images
            </CardTitle>
            <Button onClick={handleOpenUploadImageDialog} size="sm" className="hover:bg-primary">
                <Plus className="h-4 w-4 mr-2" /> Upload Image
            </Button>
          </CardHeader>
          <CardContent>
            {product.images && product.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {product.images.map((image) => (
                  <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border border-border group">
                    <img src={image.url} alt={`Product image ${image.id}`} className="object-cover w-full h-full" />
                    {/* Overlay for actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex space-x-2">
                            <Button variant="secondary" size="icon" onClick={() => handleViewImageDetails(image.id)} className="hover:bg-white/80">
                                <Eye className="h-4 w-4" />
                            </Button>
                            {/* Removed Edit Button */}
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
              <div className="text-muted-foreground text-center py-4">No images found for this product.</div>
            )}
          </CardContent>
        </Card>


        {/* Product Variants Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-secondary-foreground" /> Product Variants
            </CardTitle>
            <CardDescription>Different variations of the product.</CardDescription>
          </CardHeader>
          <CardContent>
            {product.variants && product.variants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.name}</TableCell>
                      <TableCell>
                        {Object.entries(variant.value || {})
                          .map(([key, val]) => `${key}: ${val}`)
                          .join(", ")}
                      </TableCell>
                      <TableCell>{formatCurrency(variant.price)}</TableCell>
                      <TableCell>
                        <Badge className={variant.stock === 0 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
                          {variant.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(variant.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVariantDetails(variant.id)}
                          className="hover:bg-primary"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View Variant
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No variants found for this product.</div>
            )}
          </CardContent>
        </Card>

        {/* Product Reviews Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary-foreground" /> Product Reviews
            </CardTitle>
            <CardDescription>Customer reviews for this product.</CardDescription>
          </CardHeader>
          <CardContent>
            {product.reviews && product.reviews.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="text-xs break-all">{review.userId}</TableCell>
                      <TableCell className="flex items-center">
                        {review.rating} <Star className="h-4 w-4 text-yellow-500 ml-1" />
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{review.comment || "No comment"}</TableCell>
                      <TableCell>{formatDate(review.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUserDetails(review.userId)}
                          className="hover:bg-primary"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View User
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No reviews found for this product.</div>
            )}
          </CardContent>
        </Card>

        {/* Product Cart Items Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary-foreground" /> Cart Items
            </CardTitle>
            <CardDescription>Instances of this product in active shopping carts.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelatedItems ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner className="h-6 w-6 text-primary" />
                <p className="ml-3 text-muted-foreground">Loading cart items...</p>
              </div>
            ) : product.cartItems && product.cartItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cart ID</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price (per item)</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Added At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.cartItems.map((item) => {
                    const variant = item.variantId ? relatedVariantDetailsMap.get(item.variantId) : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs break-all">{item.cartId}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {variant?.name || "N/A"}
                          {variant?.value && (
                            <span className="text-xs ml-1">
                              ({Object.entries(variant.value).map(([k, v]) => `${k}: ${v}`).join(', ')})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.quantity * item.price)}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-primary"
                              onClick={() => handleViewCartDetails(item.cartId)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Cart
                            </Button>
                            {item.variantId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary"
                                onClick={() => handleViewVariantDetails(item.variantId!)}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Variant
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No cart items found for this product.</div>
            )}
          </CardContent>
        </Card>

        {/* Product Order Items Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-secondary-foreground" /> Order Items
            </CardTitle>
            <CardDescription>Instances of this product in completed orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelatedItems ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner className="h-6 w-6 text-primary" />
                <p className="ml-3 text-muted-foreground">Loading order items...</p>
              </div>
            ) : product.orderItems && product.orderItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Item ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price (per item)</TableHead>
                    <TableHead>Ordered At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.orderItems.map((item) => {
                    const variant = item.variantId ? relatedVariantDetailsMap.get(item.variantId) : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs break-all">{item.id}</TableCell>
                        <TableCell className="text-xs break-all">{item.orderId}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {variant?.name || "N/A"}
                          {variant?.value && (
                            <span className="text-xs ml-1">
                              ({Object.entries(variant.value).map(([k, v]) => `${k}: ${v}`).join(', ')})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrderDetails(item.orderId)}
                              className="hover:bg-primary"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View Order
                            </Button>
                            {item.variantId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary"
                                onClick={() => handleViewVariantDetails(item.variantId!)}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Variant
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No order items found for this product.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Image Dialog */}
      <Dialog open={isUploadImageDialogOpen} onOpenChange={(open) => {
        setIsUploadImageDialogOpen(open);
        if (!open) {
          setIsUploadImageLoading(false);
          setUploadImageForm({
            image: null,
            productId: productId, // Reset to current product's ID
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Image for {product?.name}</DialogTitle>
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
            {/* Display message about automatic association with current product */}
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                This image will be automatically associated with the current product: <span className="font-semibold text-foreground">{product?.name}</span>
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

      {/* NO LONGER USED: Edit Image Dialog (removed as per requirements) */}
      {/* If you need a more general image edit dialog accessible elsewhere, keep it separate */}

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
    </div>
  );
};

export default ProductDetailsPage;