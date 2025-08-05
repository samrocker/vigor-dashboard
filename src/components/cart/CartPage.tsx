"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  ShoppingCart,
  User as UserIcon,
  DollarSign,
  Calendar,
  Info,
  ArrowLeft,
  Package,
  Type,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions (Comprehensive for Cart Details Page) ---

// User interface for nested user data in cart response
interface UserForCartDetails {
  id: string;
  name: string;
  email: string;
}

// Product interface for nested product data in cart item response
// This will now represent the data fetched from /public/product/:id
interface ProductDetailsFromApi {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  additionalDetails?: { [key: string]: any };
  COD: boolean;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
}

// Variant interface for nested variant data in cart item response
// This will now represent the data fetched from /public/variant/:id
interface VariantDetailsFromApi {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

// Cart Item interface with relations (product and variant might be partial from cart API, full from separate calls)
interface CartItemDetails {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number; // Price from cart item itself
  createdAt: string;
  updatedAt: string;
  // We keep these optional, as we will fetch their full details separately for display
  product?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number;
    stock?: number;
    additionalDetails?: { [key: string]: any };
  };
  variant?: {
    id: string;
    name: string;
    value?: { [key: string]: string };
    price?: number;
    stock?: number;
  };
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

// API Response for single product
interface ProductApiResponse extends ApiResponse {
  data: {
    product: ProductDetailsFromApi;
  };
}

// API Response for single variant
interface VariantApiResponse extends ApiResponse {
  data: {
    variant: VariantDetailsFromApi;
  };
}

// --- Utility Functions ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string | null): string {
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
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
}

// --- Component ---
const CartDetailsPage = () => {
  const params = useParams();
  const cartId = params.id as string;
  const router = useRouter();

  const [cart, setCart] = useState<CartDetails | null>(null);
  const [loadingCart, setLoadingCart] = useState(true); // Loading state for initial cart fetch
  const [loadingItemDetails, setLoadingItemDetails] = useState(false); // Loading state for product/variant details
  // Removed error state: const [error, setError] = useState<string | null>(null);

  // Maps to store product and variant details fetched from their respective APIs
  const [productDetailsMap, setProductDetailsMap] = useState<
    Map<string, ProductDetailsFromApi>
  >(new Map());
  const [variantDetailsMap, setVariantDetailsMap] = useState<
    Map<string, VariantDetailsFromApi>
  >(new Map());

  // Callback to fetch individual product and variant details
  // This callback is now stable (empty dependency array) and receives current maps as arguments
  const fetchItemDetails = useCallback(
    async (
      items: CartItemDetails[],
      currentProductDetailsMap: Map<string, ProductDetailsFromApi>,
      currentVariantDetailsMap: Map<string, VariantDetailsFromApi>
    ) => {
      setLoadingItemDetails(true);
      const uniqueProductIds = new Set<string>();
      const uniqueVariantIds = new Set<string>();

      items.forEach((item) => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) {
          uniqueVariantIds.add(item.variantId);
        }
      });

      const newProductDetails = new Map<string, ProductDetailsFromApi>();
      const newVariantDetails = new Map<string, VariantDetailsFromApi>();
      const fetchPromises: Promise<void>[] = [];

      // Fetch product details
      uniqueProductIds.forEach((productId) => {
        // Use the passed current map for the check
        if (!currentProductDetailsMap.has(productId)) {
          fetchPromises.push(
            axiosInstance
              .get<ProductApiResponse>(
                `/public/product/${productId}?includeRelations=true`
              )
              .then((response) => {
                if (
                  response.data.status === "success" &&
                  response.data.data?.product
                ) {
                  newProductDetails.set(productId, response.data.data.product);
                } else {
                  console.warn(
                    `Failed to fetch product ${productId}: ${response.data.message}`
                  );
                  toast.error(
                    `Failed to load product details for ID: ${productId}.`
                  );
                }
              })
              .catch((err) => {
                console.error(`Error fetching product ${productId}:`, err);
                toast.error(
                  `Error loading product details for ID: ${productId}.`
                );
              })
          );
        }
      });

      // Fetch variant details
      uniqueVariantIds.forEach((variantId) => {
        // Use the passed current map for the check
        if (!currentVariantDetailsMap.has(variantId)) {
          fetchPromises.push(
            axiosInstance
              .get<VariantApiResponse>(
                `/public/variant/${variantId}?includeRelations=true`
              )
              .then((response) => {
                if (
                  response.data.status === "success" &&
                  response.data.data?.variant
                ) {
                  newVariantDetails.set(variantId, response.data.data.variant);
                } else {
                  console.warn(
                    `Failed to fetch variant ${variantId}: ${response.data.message}`
                  );
                  toast.error(
                    `Failed to load variant details for ID: ${variantId}.`
                  );
                }
              })
              .catch((err) => {
                console.error(`Error fetching variant ${variantId}:`, err);
                toast.error(
                  `Error loading variant details for ID: ${variantId}.`
                );
              })
          );
        }
      });

      await Promise.allSettled(fetchPromises); // Wait for all fetches to complete

      // Manually merge maps without spreading Map directly to avoid TS2802 if downlevelIteration is not enabled
      setProductDetailsMap((prev) => {
        const mergedMap = new Map(prev);
        newProductDetails.forEach((value, key) => mergedMap.set(key, value));
        return mergedMap;
      });
      setVariantDetailsMap((prev) => {
        const mergedMap = new Map(prev);
        newVariantDetails.forEach((value, key) => mergedMap.set(key, value));
        return mergedMap;
      });

      setLoadingItemDetails(false);
    },
    []
  ); // Empty dependency array: fetchItemDetails is now stable

  // Effect for initial cart data fetch
  useEffect(() => {
    const fetchCart = async (id: string) => {
      setLoadingCart(true);
      try {
        // Fetch cart details, we still use includeRelations=true as it might provide other useful data
        const response = await axiosInstance.get<CartDetailsApiResponse>(
          `/admin/cart/${id}?includeRelations=true`
        );
        if (response.data.status === "success" && response.data.data?.cart) {
          setCart(response.data.data.cart);
          // Removed setError(null);
          // After cart is fetched, initiate fetching details for its items
          if (response.data.data.cart.items.length > 0) {
            // Pass the current state of the maps to the stable fetchItemDetails callback
            // This call will trigger the item details fetch, but its updates won't re-run this useEffect
            fetchItemDetails(
              response.data.data.cart.items,
              productDetailsMap,
              variantDetailsMap
            );
          } else {
            setLoadingItemDetails(false); // No items to fetch details for
          }
        } else {
          toast.error(response.data.message || "Failed to fetch cart details."); // Display toast error
          setCart(null);
          setLoadingItemDetails(false); // No items to fetch details for
        }
      } catch (err: any) {
        toast.error(
          err.message ||
            "An unexpected error occurred while fetching cart details."
        ); // Display toast error
        setCart(null);
        setLoadingItemDetails(false);
      } finally {
        setLoadingCart(false);
      }
    };

    if (cartId) {
      fetchCart(cartId);
    }
  }, [cartId, fetchItemDetails]); // Removed productDetailsMap, variantDetailsMap from dependencies

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`); // Navigate to product details page
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/variant/${variantId}`);
  };

  const handleViewUserDetails = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const isLoading = loadingCart || loadingItemDetails;

  // --- Render Loading/Error/Not Found States ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full font-sans">
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
          {/* Cart Information Card Skeleton */}
          <Card className="mb-8 shadow-sm rounded-lg">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[...Array(5)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Cart Items Card Skeleton */}
          <Card className="shadow-sm rounded-lg">
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
                        <Skeleton className="h-4 w-32" />
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
      </div>
    );
  }

  // Removed the `if (error && !cart)` block as errors are handled by toasts.

  if (!cart && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans"
      >
        <Card className="border-border w-full max-w-md rounded-lg">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Cart not found.</p>
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

  // Calculate total items and total amount
  const totalItemsInCart =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalCartAmount =
    cart?.items.reduce((sum, item) => sum + item.quantity * item.price, 0) ||
    0;

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-background font-sans">
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
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Cart Details
                </h1>
                <span className="text-muted-foreground">
                  Cart ID: {cart?.id}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/cart')}
              className="hover:bg-primary"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Carts
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cart Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Info className="h-5 w-5 text-primary" /> Cart Information
              </CardTitle>
              <CardDescription>
                Comprehensive details about this shopping cart.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* Cart ID */}
              <div>
                <p className="text-muted-foreground">Cart ID:</p>
                <span className="font-medium text-foreground break-all">
                  {cart?.id}
                </span>
              </div>
              {/* User Name */}
              <div>
                <p className="text-muted-foreground">Customer Name:</p>
                <span className="font-medium text-foreground flex items-center">
                  <UserIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                  {cart?.user?.name || "N/A"}
                </span>
                {cart?.user?.id && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleViewUserDetails(cart.user!.id)}
                    className="p-0 h-auto text-sm text-primary hover:underline mt-1"
                  >
                    View User Details
                  </Button>
                )}
              </div>
              {/* Total Items */}
              <div>
                <p className="text-muted-foreground">Total Items:</p>
                <span className="font-medium text-foreground">
                  {totalItemsInCart}
                </span>
              </div>
              {/* Total Amount */}
              <div>
                <p className="text-muted-foreground">Total Amount:</p>
                <span className="font-medium text-foreground flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  {formatCurrency(totalCartAmount)}
                </span>
              </div>
              {/* Created At */}
              <div>
                <p className="text-muted-foreground">Created At:</p>
                <span className="font-medium text-foreground flex items-center">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(cart?.createdAt || null)}
                </span>
              </div>
              {/* Updated At */}
              <div>
                <p className="text-muted-foreground">Last Updated At:</p>
                <span className="font-medium text-foreground flex items-center">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(cart?.updatedAt || null)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cart Items Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Package className="h-5 w-5 text-secondary-foreground" /> Cart
                Items
              </CardTitle>
              <CardDescription>
                Products currently in this cart.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cart?.items && cart.items.length > 0 ? (
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
                    {cart.items.map((item) => {
                      // Get product and variant details from the maps
                      const productDetail = productDetailsMap.get(
                        item.productId
                      );
                      const variantDetail = item.variantId
                        ? variantDetailsMap.get(item.variantId)
                        : null;

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center flex-wrap">
                              {productDetail?.name || item.product?.name || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex flex-col">
                              {variantDetail ? (
                                <div className="flex items-center font-medium text-foreground">
                                  <span>{variantDetail.name || "N/A"}</span>
                                </div>
                              ) : (
                                item.variant ? ( // Fallback to cart's nested variant if direct fetch failed
                                  <div className="flex items-center font-medium text-foreground">
                                    <span>{item.variant.name || "N/A"}</span>
                                  </div>
                                ) : "N/A"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {formatCurrency(item.quantity * item.price)}
                          </TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() =>
                                  handleViewProductDetails(item.productId)
                                }
                                disabled={!item.productId}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Product
                              </Button>
                              {item.variantId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-primary hover:text-primary-foreground transition-colors"
                                  onClick={() =>
                                    handleViewVariantDetails(item.variantId!)
                                  }
                                  disabled={!item.variantId}
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
                <div className="text-muted-foreground text-center py-4">
                  No items found in this cart.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CartDetailsPage;