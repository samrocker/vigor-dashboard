"use client";

import React, { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Type, // Main variant icon
  Info, // General info
  Calendar, // Dates
  ArrowLeft, // Back button
  DollarSign, // Price
  Boxes, // Stock
  Package, // Product icon
  ShoppingCart, // For cart items
  ListOrdered, // For order items
  Eye, // For view details buttons
  FolderOpen, // For subcategory
  CheckCircle, // For COD enabled
  XCircle, // For COD disabled
} from "lucide-react";
import { toast } from "sonner";

// --- Type Definitions (Comprehensive for Variant Details Page) ---

// Simplified Product interface for nested product data in variant response
interface ProductForVariantDetails {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: { [key: string]: any }; // Changed to `any` to match API
  price: number;
  COD: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
  subCategory?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface CartItemForVariant {
  id: string;
  cartId: string;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  // Assuming cart items might have a direct link to user or cart details page
}

interface OrderItemForVariant {
  id: string;
  orderId: string;
  productId: string; // Added from API response
  variantId: string | null; // Added from API response
  quantity: number;
  unitPrice: number; // Changed from price to unitPrice as per API
  totalPrice: number;
  productName: string; // Added from API response
  productDetails: { [key: string]: any }; // Added from API response
  createdAt: string;
  updatedAt: string;
  // Assuming order items might have a direct link to order details page
}

// Main Variant interface for details page, including all relations
export interface VariantDetails {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string }; // Assuming string values in the object
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  cartItems?: CartItemForVariant[];
  orderItems?: OrderItemForVariant[];
  product?: ProductForVariantDetails; // Full product object
}

// API Response for specific variant with relations
interface VariantDetailsApiResponse extends ApiResponse {
  data: {
    variant: VariantDetails;
  };
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

// --- Component ---
const VariantDetailsPage = () => {
  const params = useParams();
  const variantId = params.id as string;
  const router = useRouter();

  const [variant, setVariant] = useState<VariantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (variantId) {
      fetchVariantDetails(variantId);
    }
  }, [variantId]);

  const fetchVariantDetails = async (id: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<VariantDetailsApiResponse>(
        `/public/variant/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.variant) {
        setVariant(response.data.data.variant);
        // Removed setError(null);
      } else {
        toast.error(response.data.message || "Failed to fetch variant details."); // Display toast error
        setVariant(null);
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          "An unexpected error occurred while fetching variant details."
      ); // Display toast error
      setVariant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`); // Navigate to product details page
  };

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/order/${orderId}`); // Navigate to order details page
  };

  const handleViewCartDetails = (cartId: string) => {
    router.push(`/cart/${cartId}`); // Navigate to cart details page
  };

  // --- Render Loading/Error/Not Found States ---
  if (loading) {
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
          {/* Variant Information Card Skeleton */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[...Array(7)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Parent Product Information Card Skeleton */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[...Array(6)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
              <div className="lg:col-span-3">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="lg:col-span-3">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="md:col-span-3 text-right">
                <Skeleton className="h-10 w-48" />
              </div>
            </CardContent>
          </Card>

          {/* Variant Cart Items Card Skeleton */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-28" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>{" "}
                    {/* Added for Actions */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16" />
                      </TableCell>{" "}
                      {/* Added for Actions */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Variant Order Items Card Skeleton */}
          <Card className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
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
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16" />
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

  // Removed the `if (error && !variant)` block as errors are handled by toasts.

  if (!variant) {
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
              <p>Variant not found.</p>
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

  // --- Main Component Render ---
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
                <Type className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Variant Details
                </h1>
                <span className="text-muted-foreground">
                  Variant ID: {variant.id}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/product/' + variant.productId)}
              className="hover:bg-primary"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to product 
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Variant Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Variant Information
              </CardTitle>
              <CardDescription>
                Comprehensive details about this product variant.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* Variant ID */}
              <div>
                <p className="text-muted-foreground">Variant ID:</p>
                <span className="font-medium text-foreground break-all">
                  {variant.id}
                </span>
              </div>
              {/* Name */}
              <div>
                <p className="text-muted-foreground">Name:</p>
                <span className="font-medium text-foreground">{variant.name}</span>
              </div>
              {/* Value */}
              <div>
                <p className="text-muted-foreground">Value:</p>
                <span className="font-medium text-foreground">
                  {/* Render key-value pairs from the 'value' object */}
                  {Object.entries(variant.value || {})
                    .map(([key, val]) => (
                      <Badge key={key} variant="secondary" className="mr-1 mb-1">
                        {key}: {val}
                      </Badge>
                    )) || "N/A"}
                </span>
              </div>
              {/* Price */}
              <div>
                <p className="text-muted-foreground">Price:</p>
                <span className="font-medium text-foreground flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  {formatCurrency(variant.price)}
                </span>
              </div>
              {/* Stock */}
              <div>
                <p className="text-muted-foreground">Stock:</p>
                <Badge
                  className={
                    variant.stock === 0
                      ? "bg-red-100 hover:bg-red-100 text-red-800"
                      : "bg-blue-100 hover:bg-blue-100 text-blue-800"
                  }
                >
                  {variant.stock} units
                </Badge>
              </div>
              {/* Created At */}
              <div>
                <p className="text-muted-foreground">Created At:</p>
                <span className="font-medium text-foreground flex items-center">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(variant.createdAt)}
                </span>
              </div>
              {/* Updated At */}
              <div>
                <p className="text-muted-foreground">Last Updated At:</p>
                <span className="font-medium text-foreground flex items-center">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(variant.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parent Product Information Card */}
        {variant.product ? ( // Conditionally render if product data exists
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="mb-8 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-secondary-foreground" />{" "}
                  Parent Product
                </CardTitle>
                <CardDescription>
                  Details about the product this variant belongs to.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Product Name:</p>
                  <span className="font-medium text-foreground">
                    {variant.product.name}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Product ID:</p>
                  <span className="font-medium text-foreground break-all">
                    {variant.product.id}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Product Price:</p>
                  <span className="font-medium text-foreground flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                    {formatCurrency(variant.product.price)}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Product Stock:</p>
                  <Badge
                    className={
                      variant.product.stock === 0
                        ? "bg-red-100 hover:bg-red-100 text-red-800"
                        : "bg-blue-100 hover:bg-blue-100 text-blue-800"
                    }
                  >
                    {variant.product.stock} units
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">COD Available:</p>
                  <Badge
                    className={
                      variant.product.COD
                        ? "bg-green-100 hover:bg-green-100 text-green-800"
                        : "bg-red-100 hover:bg-red-100 text-red-800"
                    }
                  >
                    {variant.product.COD ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    {variant.product.COD ? "Yes" : "No"}
                  </Badge>
                </div>
                {variant.product.subCategory && (
                  <div>
                    <p className="text-muted-foreground">SubCategory:</p>
                    <span className="font-medium text-foreground flex items-center">
                      <FolderOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                      {variant.product.subCategory.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({variant.product.subCategory.id})
                      </span>
                    </span>
                  </div>
                )}
                <div className="lg:col-span-3">
                  <p className="text-muted-foreground">Description:</p>
                  <span className="font-medium text-foreground">
                    {variant.product.description || "N/A"}
                  </span>
                </div>
                {variant.product.additionalDetails &&
                  Object.keys(variant.product.additionalDetails).length > 0 && (
                    <div className="lg:col-span-3">
                      <p className="text-muted-foreground mb-2">
                        Additional Details:
                      </p>
                      {/* MODIFIED: Changed grid to flex column with gap for better visual grouping */}
                      <div className="flex flex-col gap-2">
                        {Object.entries(variant.product.additionalDetails).map(
                          ([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <p className="text-muted-foreground capitalize font-semibold">
                                {key}:
                              </p>
                              <span className="font-medium text-foreground">
                                {String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                <div className="md:col-span-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProductDetails(variant.product!.id)}
                    className="hover:bg-primary"
                    disabled={!variant.product?.id}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View Product Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="mb-8 shadow-sm border-dashed border-2 border-muted-foreground/50">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-3" />
                <p>No parent product details available for this variant.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Variant Cart Items Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-secondary-foreground" />{" "}
                Cart Items
              </CardTitle>
              <CardDescription>
                Instances of this variant in active shopping carts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {variant.cartItems && variant.cartItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cart ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price (per item)</TableHead>
                      <TableHead>Added At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>{" "}
                      {/* Added this line */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variant.cartItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs break-all">
                          {item.cartId}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {" "}
                          {/* Added this Cell */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary"
                            onClick={() => handleViewCartDetails(item.cartId)}
                            disabled={!item.cartId}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Cart
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No cart items found for this variant.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Variant Order Items Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-secondary-foreground" />{" "}
                Order Items
              </CardTitle>
              <CardDescription>
                Instances of this variant in completed orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {variant.orderItems && variant.orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Ordered At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variant.orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName || "N/A"}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary"
                            onClick={() => handleViewOrderDetails(item.orderId)}
                            disabled={!item.orderId}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No order items found for this variant.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default VariantDetailsPage;