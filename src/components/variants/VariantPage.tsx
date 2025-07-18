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
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Type Definitions (Comprehensive for Variant Details Page) ---

// Simplified Product interface for nested product data in variant response
interface ProductForVariantDetails {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: { [key: string]: any };
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
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  // Assuming order items might have a direct link to order details page
}

// Main Variant interface for details page, including all relations
export interface VariantDetails {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string };
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
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Component ---
const VariantDetailsPage = () => {
  const params = useParams();
  const variantId = params.id as string;
  const router = useRouter();

  const [variant, setVariant] = useState<VariantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch variant details.");
        setVariant(null);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred while fetching variant details."
      );
      setVariant(null);
      toast.error("Failed to load variant details.");
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

  // --- Render Loading/Error/Not Found States ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading variant details...</p>
      </div>
    );
  }

  if (error && !variant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
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

  if (!variant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
      </div>
    );
  }

  // --- Main Component Render ---
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
                <Type className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Variant Details
                </h1>
                <p className="text-muted-foreground">
                  Variant ID: {variant.id}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="hover:bg-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Variants
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Variant Information Card */}
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
              <p className="font-medium text-foreground break-all">
                {variant.id}
              </p>
            </div>
            {/* Name */}
            <div>
              <p className="text-muted-foreground">Name:</p>
              <p className="font-medium text-foreground">{variant.name}</p>
            </div>
            {/* Value */}
            <div>
              <p className="text-muted-foreground">Value:</p>
              <p className="font-medium text-foreground">
                {Object.entries(variant.value || {})
                  .map(([key, val]) => `${key}: ${val}`)
                  .join(", ")}
              </p>
            </div>
            {/* Price */}
            <div>
              <p className="text-muted-foreground">Price:</p>
              <p className="font-medium text-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                {formatCurrency(variant.price)}
              </p>
            </div>
            {/* Stock */}
            <div>
              <p className="text-muted-foreground">Stock:</p>
              <Badge
                className={
                  variant.stock === 0
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }
              >
                {variant.stock} units
              </Badge>
            </div>
            {/* Created At */}
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(variant.createdAt)}
              </p>
            </div>
            {/* Updated At */}
            <div>
              <p className="text-muted-foreground">Last Updated At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(variant.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parent Product Information Card */}
        {variant.product && (
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary-foreground" /> Parent
                Product
              </CardTitle>
              <CardDescription>
                Details about the product this variant belongs to.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Product Name:</p>
                <p className="font-medium text-foreground">
                  {variant.product.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Product ID:</p>
                <p className="font-medium text-foreground break-all">
                  {variant.product.id}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Product Price:</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(variant.product.price)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Product Stock:</p>
                <Badge
                  className={
                    variant.product.stock === 0
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
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
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {variant.product.COD ? "Yes" : "No"}
                </Badge>
              </div>
              {variant.product.subCategory && (
                <div>
                  <p className="text-muted-foreground">SubCategory:</p>
                  <p className="font-medium text-foreground flex items-center">
                    <FolderOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                    {variant.product.subCategory.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({variant.product.subCategory.id})
                    </span>
                  </p>
                </div>
              )}
              <div className="lg:col-span-3">
                <p className="text-muted-foreground">Description:</p>
                <p className="font-medium text-foreground">
                  {variant.product.description || "N/A"}
                </p>
              </div>
              {variant.product.additionalDetails &&
                Object.keys(variant.product.additionalDetails).length > 0 && (
                  <div className="lg:col-span-3">
                    {" "}
                    {/* Changed to grid layout for better UX */}
                    <p className="text-muted-foreground mb-2">
                      Additional Details:
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {Object.entries(variant.product.additionalDetails).map(
                        ([key, value]) => (
                          <React.Fragment key={key}>
                            <p className="text-muted-foreground capitalize font-semibold">
                              {key}:
                            </p>
                            <p className="font-medium text-foreground">
                              {String(value)}
                            </p>
                          </React.Fragment>
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
                >
                  <Eye className="h-4 w-4 mr-1" /> View Product Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Variant Cart Items Card */}
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
                    <TableHead>Cart Item ID</TableHead>
                    <TableHead>Cart ID</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price (per item)</TableHead>
                    <TableHead>Added At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variant.cartItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs break-all">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-xs break-all">
                        {item.cartId}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
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

        {/* Variant Order Items Card */}
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
                    <TableHead>Order Item ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price (per item)</TableHead>
                    <TableHead>Ordered At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variant.orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs break-all">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-xs break-all">
                        {item.orderId}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-primary"
                          onClick={() => handleViewOrderDetails(item.orderId)}
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
      </div>
    </div>
  );
};

export default VariantDetailsPage;
