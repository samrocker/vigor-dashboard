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
  ShoppingCart, // Main cart icon
  User as UserIcon, // For user details
  DollarSign, // For price
  Calendar, // For dates
  Info, // General info
  ArrowLeft, // Back button
  Package, // For product in cart item
  Type, // For variant in cart item
  Eye, // For view details buttons
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Type Definitions (Comprehensive for Cart Details Page) ---

// User interface for nested user data in cart response
interface UserForCartDetails {
  id: string;
  name: string;
  email: string;
}

// Product interface for nested product data in cart item response
interface ProductForCartItemDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

// Variant interface for nested variant data in cart item response
interface VariantForCartItemDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

// Cart Item interface with relations
interface CartItemDetails {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  product?: ProductForCartItemDetails; // Included when includeRelations=true
  variant?: VariantForCartItemDetails; // Included when includeRelations=true
}

// Main Cart interface for details page, including all relations
export interface CartDetails {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItemDetails[]; // Array of detailed cart items
  user?: UserForCartDetails; // Full user object
}

// API Response for specific cart with relations
interface CartDetailsApiResponse extends ApiResponse {
  data: {
    cart: CartDetails;
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
const CartDetailsPage = () => {
  const params = useParams();
  const cartId = params.id as string;
  const router = useRouter();

  const [cart, setCart] = useState<CartDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cartId) {
      fetchCartDetails(cartId);
    }
  }, [cartId]);

  const fetchCartDetails = async (id: string) => {
    setLoading(true);
    try {
      // Fetch cart with relations for user, product, and variant names
      const response = await axiosInstance.get<CartDetailsApiResponse>(
        `/admin/cart/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.cart) {
        setCart(response.data.data.cart);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch cart details.");
        setCart(null);
      }
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred while fetching cart details."
      );
      setCart(null);
      toast.error("Failed to load cart details.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewProductDetails = (productId: string) => {
    router.push(`/admin/products/${productId}`); // Navigate to product details page
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/admin/variants/${variantId}`); // Navigate to variant details page
  };

  const handleViewUserDetails = (userId: string) => {
    router.push(`/users/${userId}`); // Navigate to user details page
  };

  // --- Render Loading/Error/Not Found States ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading cart details...</p>
      </div>
    );
  }

  if (error && !cart) {
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

  if (!cart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Cart not found.</p>
              <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total items and total amount
  const totalItemsInCart = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

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
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Cart Details
                </h1>
                <p className="text-muted-foreground">Cart ID: {cart.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="hover:bg-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Carts
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cart Information Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Cart Information
            </CardTitle>
            <CardDescription>Comprehensive details about this shopping cart.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Cart ID */}
            <div>
              <p className="text-muted-foreground">Cart ID:</p>
              <p className="font-medium text-foreground break-all">{cart.id}</p>
            </div>
            {/* User Name */}
            <div>
              <p className="text-muted-foreground">Customer Name:</p>
              <p className="font-medium text-foreground flex items-center">
                <UserIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                {cart.user?.name || "N/A"}
              </p>
              {cart.user?.id && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleViewUserDetails(cart.user!.id)}
                  className="hover:bg-primary"
                >
                  View User Details
                </Button>
              )}
            </div>
            {/* Total Items */}
            <div>
              <p className="text-muted-foreground">Total Items:</p>
              <p className="font-medium text-foreground">{totalItemsInCart}</p>
            </div>
            {/* Total Amount */}
            <div>
              <p className="text-muted-foreground">Total Amount:</p>
              <p className="font-medium text-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                {formatCurrency(totalCartAmount)}
              </p>
            </div>
            {/* Created At */}
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(cart.createdAt)}
              </p>
            </div>
            {/* Updated At */}
            <div>
              <p className="text-muted-foreground">Last Updated At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(cart.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-secondary-foreground" /> Cart Items
            </CardTitle>
            <CardDescription>Products currently in this cart.</CardDescription>
          </CardHeader>
          <CardContent>
            {cart.items && cart.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price (per item)</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Added At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product?.name || "N/A"}
                        {item.product?.id && (
                          <span className="text-xs text-muted-foreground ml-2">({item.product.id})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.variant?.name || "N/A"}
                        {item.variant?.value && (
                          <span className="text-xs ml-1">
                            ({Object.entries(item.variant.value).map(([k, v]) => `${k}: ${v}`).join(', ')})
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
                            onClick={() => handleViewProductDetails(item.productId)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Product
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
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No items found in this cart.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CartDetailsPage;
