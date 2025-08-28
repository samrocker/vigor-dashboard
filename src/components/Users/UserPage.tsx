"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import { ApiResponse } from "@/lib/axios";
import { AxiosError } from "axios";
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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User as UserIcon, // Renamed to avoid conflict with User interface
  Mail,
  Calendar,
  Info,
  ArrowLeft,
  ShoppingCart, // For cart details
  DollarSign, // For total amount in orders
  Star, // For review rating
  Package, // For orders section
  MessageSquare, // For reviews section
  Eye, // For view details buttons
  Type, // For variant details
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Import motion

// --- Type Definitions (UPDATED/ADDED) ---

// Existing OrderStatus and PaymentStatus from AdminOrderManagement for consistency
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Simplified Order interface for display on UserPage (can be expanded if needed)
interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  productId?: string; // Assuming order might directly have a productId or through order items
}

// Product interface for nested product data in cart/order/review item response
interface ProductForRelatedDetails {
  id: string;
  name: string; // Added name property
  description: string | null;
  price: number;
  stock: number;
  imageUrl?: string; // Added for potential image preview
  // Add other fields from product API response if needed, e.g., imageUrl, additionalDetails
}

// Variant interface for nested variant data in cart item response
interface VariantForRelatedDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
  imageUrl?: string; // Added for potential image preview
}

interface CartItemDetails {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  // product and variant objects are NOT directly nested in cart/:id response
  // We will fetch them separately using productDetailsMap/variantDetailsMap
}

interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItemDetails[];
  user?: User;
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  cart?: Cart;
  orders?: Order[];
  reviews?: Review[];
}

interface UserDetailsApiResponse extends ApiResponse {
  data: {
    user: User;
  };
}

interface CartDetailsApiResponse extends ApiResponse {
  data: {
    cart: Cart;
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

const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-orange-100 text-orange-800",
  PROCESSING: "bg-orange-100 text-orange-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-purple-100 text-purple-800",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};

// --- Component ---
const UserPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [userCart, setUserCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCart, setLoadingCart] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false); // State for soft delete dialog

  // New states for action loading indicators
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [isSoftDeleting, setIsSoftDeleting] = useState<boolean>(false);

  // New states for related product/variant details
  const [productDetailsMap, setProductDetailsMap] = useState<
    Map<string, ProductForRelatedDetails>
  >(new Map());
  const [variantDetailsMap, setVariantDetailsMap] = useState<
    Map<string, VariantForRelatedDetails>
  >(new Map());
  const [loadingRelatedDetails, setLoadingRelatedDetails] =
    useState<boolean>(false);

  // Handler for recovering a soft-deleted user
  const handleRecoverUser = async () => {
    setIsRecovering(true); // Set loading state for recovery action
    try {
      const response = await axiosInstance.post(`/admin/user/recover/${id}`);
      if (response.data.status === "success") {
        toast.success("User recovered successfully!");
        // Update user state to reflect active status
        setUser((prevUser) =>
          prevUser ? { ...prevUser, isActive: true, deletedAt: null } : null
        );
      } else {
        toast.error(response.data.message || "Failed to recover user.");
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      toast.error(axiosError.message || "An error occurred during recovery.");
    } finally {
      setIsRecovering(false); // Reset loading state
    }
  };

  // Handler for soft-deleting a user
  const handleSoftDeleteUser = async () => {
    setIsSoftDeleting(true); // Set loading state for soft deletion action
    try {
      const response = await axiosInstance.delete(
        `/admin/user/soft-delete/${id}`
      );
      if (response.data.status === "success") {
        toast.success("User soft-deleted successfully!");
        setIsDeleteDialogOpen(false); // Close dialog on success
        // Update user state to reflect inactive status and deletedAt timestamp
        setUser((prevUser) =>
          prevUser
            ? {
                ...prevUser,
                isActive: false,
                deletedAt: new Date().toISOString(),
              }
            : null
        );
      } else {
        toast.error(response.data.message || "Failed to soft-delete user.");
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      toast.error(
        axiosError.message || "An error occurred during soft deletion."
      );
    } finally {
      setIsSoftDeleting(false); // Reset loading state
    }
  };

  // Effect to fetch initial user data and potentially cart details
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userResponse = await axiosInstance.get<UserDetailsApiResponse>(
          `/admin/user/${id}?includeRelations=true`
        );
        if (
          userResponse.data.status === "success" &&
          userResponse.data.data?.user
        ) {
          setUser(userResponse.data.data.user);
          // If user has a cart, fetch its details
          if (userResponse.data.data.user.cart?.id) {
            fetchCartDetails(userResponse.data.data.user.cart.id);
          } else {
            setUserCart(null); // No cart for this user
          }
        } else {
          setError(userResponse.data.message || "Failed to fetch user");
          setUser(null);
        }
      } catch (err) {
        const axiosError = err as AxiosError;
        setError(axiosError.message || "An unexpected error occurred.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchCartDetails = async (cartId: string) => {
      setLoadingCart(true);
      try {
        const cartResponse = await axiosInstance.get<CartDetailsApiResponse>(
          `/admin/cart/${cartId}?includeRelations=true`
        );
        if (
          cartResponse.data.status === "success" &&
          cartResponse.data.data?.cart
        ) {
          setUserCart(cartResponse.data.data.cart);
        } else {
          toast.error(
            cartResponse.data.message || "Failed to fetch cart details."
          );
          setUserCart(null);
        }
      } catch (err) {
        const axiosError = err as AxiosError;
        toast.error(
          axiosError.message || "An error occurred while fetching cart details."
        );
        setUserCart(null);
      } finally {
        setLoadingCart(false);
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id]);

  // Effect to fetch related product and variant details for cart, orders, and reviews
  useEffect(() => {
    const fetchRelatedDetails = async () => {
      setLoadingRelatedDetails(true);
      const uniqueProductIds = new Set<string>();
      const uniqueVariantIds = new Set<string>();

      // Collect product IDs from orders (if they exist, assuming they might in a real app)
      // Note: The provided Order interface doesn't have productId, but if it did, this is where you'd add it.
      // For now, only collecting from reviews and cart items.

      // Collect product IDs from reviews
      user?.reviews?.forEach((review) => {
        uniqueProductIds.add(review.productId);
      });

      // Collect product and variant IDs from cart items
      userCart?.items?.forEach((item) => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });

      const newProductDetails = new Map<string, ProductForRelatedDetails>();
      const newVariantDetails = new Map<string, VariantForRelatedDetails>();

      // Fetch product details for all unique product IDs
      const productPromises = Array.from(uniqueProductIds).map(async (pId) => {
        try {
          const response = await axiosInstance.get<
            ApiResponse<{ product: ProductForRelatedDetails }>
          >(`/public/product/${pId}?includeRelations=true`);
          if (
            response.data.status === "success" &&
            response.data.data?.product
          ) {
            newProductDetails.set(pId, response.data.data.product);
          }
        } catch (err) {
          console.error(`Failed to fetch product ${pId}:`, err);
          // Optionally toast an error here, but console.error is often sufficient for background fetches
        }
      });

      // Fetch variant details for all unique variant IDs
      const variantPromises = Array.from(uniqueVariantIds).map(async (vId) => {
        try {
          const response = await axiosInstance.get<
            ApiResponse<{ variant: VariantForRelatedDetails }>
          >(`/public/variant/${vId}?includeRelations=true`);
          if (
            response.data.status === "success" &&
            response.data.data?.variant
          ) {
            newVariantDetails.set(vId, response.data.data.variant);
          }
        } catch (err) {
          console.error(`Failed to fetch variant ${vId}:`, err);
          // Optionally toast an error here
        }
      });

      // Wait for all product and variant fetches to complete
      await Promise.all([...productPromises, ...variantPromises]);

      setProductDetailsMap(newProductDetails);
      setVariantDetailsMap(newVariantDetails);
      setLoadingRelatedDetails(false);
    };

    // Only fetch if user or cart data is available and not already loading
    if ((user || userCart) && !loading && !loadingCart) {
      fetchRelatedDetails();
    }
  }, [user, userCart, loading, loadingCart]); // Re-run when user or userCart changes, or initial loading completes

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/variant/${variantId}`);
  };

  const handleViewCartDetails = (cartId: string) => {
    // New handler for viewing cart details
    router.push(`/cart/${cartId}`);
  };

  // --- Render Loading/Error/Not Found States ---
  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
              <Button
                onClick={() => router.back()}
                className="mt-4"
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

  if (!user && !loading) {
    // Only show not found if not loading and user is null
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>User not found.</p>
              <Button
                onClick={() => router.back()}
                className="mt-4"
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

  const totalItemsInCart =
    userCart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalCartAmount =
    userCart?.items?.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    ) || 0;
  const totalUniqueProductsInCart = userCart?.items
    ? new Set(userCart.items.map((item) => item.productId)).size
    : 0;

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-background">
      {/* <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      /> */}

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
                <UserIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-48" /> : user?.name}
                </h1>
                <span className="text-muted-foreground">
                  {" "}
                  {/* Changed p to span */}
                  {loading ? (
                    <Skeleton className="h-4 w-64 mt-2" />
                  ) : (
                    user?.email
                  )}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/users')}
              className="hover:bg-primary"
              disabled={loading || isRecovering || isSoftDeleting} // Disable button while loading or performing actions
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> User Information
              </CardTitle>
              <CardDescription>
                Details about this user account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* User ID */}
              <div>
                <p className="text-muted-foreground">ID:</p>
                {loading ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <span className="font-medium text-foreground break-all">
                    {user?.id}
                  </span>
                )}
              </div>
              {/* User Status */}
              <div>
                <p className="text-muted-foreground">Status:</p>
                {loading ? (
                  <Skeleton className="h-6 w-20 rounded-full" />
                ) : (
                  <Badge
                    className={`${
                      user?.isActive
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/10"
                    }`}
                  >
                    {user?.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>
              {/* Created At */}
              <div>
                <p className="text-muted-foreground">Created At:</p>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <span className="font-medium text-foreground">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(user?.createdAt || null)}
                  </span>
                )}
              </div>
              {/* Updated At */}
              <div>
                <p className="text-muted-foreground">Last Updated At:</p>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <span className="font-medium text-foreground">
                    <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                    {formatDate(user?.updatedAt || null)}
                  </span>
                )}
              </div>
              {/* Deleted At (Conditional) */}
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                user &&
                !user.isActive &&
                user.deletedAt && (
                  <div>
                    <p className="text-muted-foreground">Deleted At:</p>
                    <span className="font-medium text-foreground">
                      <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      {formatDate(user.deletedAt)}
                    </span>
                  </div>
                )
              )}
              {/* Action Buttons */}
              <div className="col-span-1 md:col-span-2 flex justify-end space-x-2 mt-4">
                {loading ? (
                  <Skeleton className="h-10 w-32" />
                ) : !user?.isActive ? (
                  <Button
                    onClick={handleRecoverUser}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={isRecovering}
                  >
                    {isRecovering ? "Activating User..." : "Activate User"}
                  </Button>
                ) : (
                  <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={isSoftDeleting}>
                        Deactivate User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This action will soft-delete the user account. The
                          user will be marked as inactive and will not be able
                          to log in. You can recover the user later.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="hover:bg-primary"
                          onClick={() => setIsDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleSoftDeleteUser}
                          disabled={isSoftDeleting}
                        >
                          {isSoftDeleting
                            ? "Deleting..."
                            : "Confirm Soft Delete"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Cart Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-secondary-foreground" />{" "}
                Cart Details
              </CardTitle>
              <CardDescription>
                Information about the user's shopping cart.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(loadingCart || loadingRelatedDetails) && !userCart ? ( // Show skeleton if loading and no cart data yet
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-48" />
                    </div>
                  ))}
                </div>
              ) : userCart && userCart.items.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Cart ID:</p>
                      <p className="font-medium text-foreground break-all">
                        {userCart.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Total Unique Products:
                      </p>
                      <p className="font-medium text-foreground">
                        {totalUniqueProductsInCart}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Quantity:</p>
                      <p className="font-medium text-foreground">
                        {totalItemsInCart}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount:</p>
                      <p className="font-medium text-foreground flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                        {formatCurrency(totalCartAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created At:</p>
                      <p className="font-medium text-foreground">
                        <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                        {formatDate(userCart.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated At:</p>
                      <p className="font-medium text-foreground">
                        <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                        {formatDate(userCart.updatedAt)}
                      </p>
                    </div>
                  </div>
                  {/* View Cart Button */}
                  <div className="text-right mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCartDetails(userCart.id)}
                      className="hover:text-primary hover:bg-primary/10 border-border"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View Full Cart Details
                    </Button>
                  </div>

                  {/* Removed Cart Items Listing Table */}
                </>
              ) : (
                // No cart found
                <div className="text-muted-foreground text-center py-4">
                  No cart details available for this user.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Orders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary-foreground" /> User
                Orders
              </CardTitle>
              <CardDescription>
                List of orders placed by this user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRelatedDetails && !user?.orders?.length ? ( // Added user? and changed from !user.orders?.length
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      {/* Removed Product column */}
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-16 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : user && user.orders && user.orders.length > 0 ? ( // Explicitly check 'user' here
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      {/* Removed Product column */}
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Directly map over user.orders as it's guaranteed to be non-null/non-undefined here */}
                    {user.orders.map((order) => {
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs break-all">
                            {order.id}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${orderStatusColors[order.status]} hover:${orderStatusColors[order.status]}`}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${
                                paymentStatusColors[order.paymentStatus]
                              } hover:${paymentStatusColors[order.paymentStatus]}`}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-primary border-border"
                              onClick={() => handleViewOrderDetails(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No orders found for this user.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Reviews Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-secondary-foreground" />{" "}
                User Reviews
              </CardTitle>
              <CardDescription>Reviews submitted by this user.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRelatedDetails && !user?.reviews?.length ? ( // Added user? and changed from !user.reviews?.length
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead> {/* New column */}
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : user && user.reviews && user.reviews.length > 0 ? ( // Explicitly check 'user' here
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead> {/* New column */}
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Directly map over user.reviews as it's guaranteed to be non-null/non-undefined here */}
                    {user.reviews.map((review) => {
                      const product = productDetailsMap.get(review.productId);
                      return (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {/* Display product name */}
                              <span>{product?.name || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="flex items-center">
                            {review.rating}{" "}
                            <Star className="h-4 w-4 text-yellow-500 ml-1" />
                          </TableCell>
                          <TableCell className="max-w-md truncate text-muted-foreground">
                            {review.comment || "No comment"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDate(review.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No reviews found for this user.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserPage;