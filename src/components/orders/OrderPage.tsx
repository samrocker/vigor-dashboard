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
  ShoppingCart,
  User as UserIcon,
  DollarSign,
  Truck,
  CreditCard,
  Calendar,
  Info,
  ArrowLeft,
  MapPin,
  Wallet,
  Eye,
  Package,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions (re-used from AdminOrderManagement or similar) ---
export interface ShippingAddress {
  id?: string;
  userId?: string;
  name?: string;
  phone?: string;
  address?: { [key: string]: any };
  city?: string;
  pin?: string;
  street?: string;
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  deletedAt?: string | null;
}

export interface BillingAddress {
  id?: string;
  userId?: string;
  name?: string;
  phone?: string;
  address?: { [key: string]: any };
  city?: string;
  pin?: string;
  street?: string;
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  deletedAt?: string | null;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type PaymentMethod = "COD" | "CARD" | "UPI" | null;

interface ProductForOrderItemDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  subCategoryId: string;
  createdAt: string;
  updatedAt: string;
}

interface VariantForOrderItemDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

interface OrderItemDetails {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productDetails: { [key: string]: any };
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId: string;
  billingAddressId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDetails[];
  user?: User;
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
}

export interface OrderDetailsApiResponse extends ApiResponse {
  data: {
    order: Order;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

// --- Runtime Arrays for Select Options ---
const orderStatusOptions: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const paymentStatusOptions: PaymentStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
];

// --- Color Mappings (consistent with AdminOrderManagement) ---
const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800", // Changed from orange
  CONFIRMED: "bg-blue-100 text-blue-800", // Changed from orange
  PROCESSING: "bg-purple-100 text-purple-800", // Changed from orange
  SHIPPED: "bg-indigo-100 text-indigo-800", // Changed from blue
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800", // Changed from destructive/10
  REFUNDED: "bg-gray-100 text-gray-800", // Changed from purple
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};

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
const OrderDetailsPage = () => {
  const params = useParams();
  const orderId = params.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingUserName, setLoadingUserName] = useState(false);
  // Removed error state: const [error, setError] = useState<string | null>(null);

  const [productDetailsMap, setProductDetailsMap] = useState<
    Map<string, ProductForOrderItemDetails>
  >(new Map());
  const [variantDetailsMap, setVariantDetailsMap] = useState<
    Map<string, VariantForOrderItemDetails>
  >(new Map());
  const [loadingRelatedDetails, setLoadingRelatedDetails] =
    useState<boolean>(false);

  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (order?.userId) {
      fetchUserName(order.userId);
    }
  }, [order?.userId]);

  useEffect(() => {
    const fetchRelatedDetails = async () => {
      setLoadingRelatedDetails(true);
      const uniqueProductIds = new Set<string>();
      const uniqueVariantIds = new Set<string>();

      order?.items?.forEach((item) => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });

      const newProductDetails = new Map<string, ProductForOrderItemDetails>();
      const newVariantDetails = new Map<string, VariantForOrderItemDetails>();

      const productPromises = Array.from(uniqueProductIds).map(async (pId) => {
        try {
          const response = await axiosInstance.get<
            ApiResponse<{ product: ProductForOrderItemDetails }>
          >(`/public/product/${pId}?includeRelations=true`);
          if (
            response.data.status === "success" &&
            response.data.data?.product
          ) {
            newProductDetails.set(pId, response.data.data.product);
          }
        } catch (err) {
          console.error(`Failed to fetch product ${pId}:`, err);
          toast.error(`Failed to load details for product ${pId}.`); // Show toast for failed product fetch
        }
      });

      const variantPromises = Array.from(uniqueVariantIds).map(async (vId) => {
        try {
          const response = await axiosInstance.get<
            ApiResponse<{ variant: VariantForOrderItemDetails }>
          >(`/public/variant/${vId}?includeRelations=true`);
          if (
            response.data.status === "success" &&
            response.data.data?.variant
          ) {
            newVariantDetails.set(vId, response.data.data.variant);
          }
        } catch (err) {
          console.error(`Failed to fetch variant ${vId}:`, err);
          toast.error(`Failed to load details for variant ${vId}.`); // Show toast for failed variant fetch
        }
      });

      await Promise.allSettled([...productPromises, ...variantPromises]); // Use Promise.allSettled to ensure all promises resolve

      setProductDetailsMap(newProductDetails);
      setVariantDetailsMap(newVariantDetails);
      setLoadingRelatedDetails(false);
    };

    if (order?.items && order.items.length > 0) {
      fetchRelatedDetails();
    } else if (order) {
      setLoadingRelatedDetails(false);
    }
  }, [order?.items]);

  const fetchOrderDetails = async (id: string) => {
    setLoadingOrder(true);
    try {
      const response = await axiosInstance.get<OrderDetailsApiResponse>(
        `/admin/order/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.order) {
        setOrder(response.data.data.order);
        // Removed setError(null);
      } else {
        toast.error(response.data.message || "Failed to fetch order details."); // Show toast on API success:false
        setOrder(null);
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          "An unexpected error occurred while fetching order details."
      ); // Show toast on API error
      setOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const fetchUserName = async (userId: string) => {
    setLoadingUserName(true);
    try {
      const response = await axiosInstance.get<ApiResponse<{ user: User }>>(
        `/admin/user/${userId}`
      );
      if (response.data.status === "success" && response.data.data?.user) {
        setUserName(response.data.data.user.name);
      } else {
        setUserName("Unknown User");
        toast.error(`Failed to load user details for ID: ${userId}.`); // Show toast for user fetch failure
      }
    } catch (err) {
      console.error(`Failed to fetch user ${userId}:`, err);
      setUserName("Unknown User");
      toast.error(`Failed to load user details for ID: ${userId}.`); // Show toast for user fetch error
    } finally {
      setLoadingUserName(false);
    }
  };

  const handleUpdateStatus = async (
    field: "status" | "paymentStatus",
    newValue: OrderStatus | PaymentStatus
  ) => {
    if (!order) return;

    if (field === "status") {
      setIsUpdatingOrderStatus(true);
    } else {
      setIsUpdatingPaymentStatus(true);
    }

    try {
      const payload = { [field]: newValue };
      const response = await axiosInstance.patch<ApiResponse>(
        `/admin/order/${order.id}`,
        payload
      );

      if (response.data.status === "success") {
        setOrder((prevOrder) => {
          if (!prevOrder) return null;
          return { ...prevOrder, [field]: newValue };
        });
        toast.success(
          `Order ${order.id} ${
            field === "status" ? "status" : "payment status"
          } updated to ${newValue}.`
        );
      } else {
        toast.error(response.data.message || `Failed to update ${field}.`);
      }
    } catch (err: any) {
      toast.error(
        err.message || `An unexpected error occurred while updating ${field}.`
      );
      console.error(`Update ${field} error:`, err);
    } finally {
      if (field === "status") {
        setIsUpdatingOrderStatus(false);
      } else {
        setIsUpdatingPaymentStatus(false);
      }
    }
  };

  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/variant/${variantId}`);
  };

  const handleViewUserDetails = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  if (loadingOrder) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full"
      >
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[...Array(9)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Ordered At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <Skeleton className="h-4 w-12" />
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

          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[...Array(7)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[...Array(7)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Removed the `if (error && !order)` block since errors are handled by toasts.

  if (!order && !loadingOrder) {
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
              <p>Order not found.</p>
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
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                  Order Details
                </h1>
                <span className="text-muted-foreground">
                  Order ID: {order?.id || "N/A"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/order')}
              className="hover:bg-primary"
              disabled={loadingOrder || !order}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {order && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="mb-8 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" /> Order Information
                  </CardTitle>
                  <CardDescription>
                    Comprehensive details about this order.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order ID:</p>
                    <span className="font-medium text-foreground break-all">
                      {order.id}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer Name:</p>
                    <span className="font-medium text-foreground flex items-center">
                      {loadingUserName ? (
                        <LoadingSpinner className="h-4 w-4 mr-2 text-primary" />
                      ) : (
                        <>
                          <UserIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                          {userName || "N/A"}
                        </>
                      )}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleViewUserDetails(order.userId)}
                      className="p-0 h-auto text-primary"
                      disabled={loadingUserName || !order.userId}
                    >
                      View User Details
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount:</p>
                    <span className="font-medium text-foreground flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  {/* Order Status Dropdown - FIXED UI ALIGNMENT AND COLORS */}
                  <div>
                    <p className="text-muted-foreground mb-1">Order Status:</p>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus: OrderStatus) =>
                        handleUpdateStatus("status", newStatus)
                      }
                      disabled={
                        isUpdatingOrderStatus || loadingOrder || !order
                      }
                    >
                      <SelectTrigger
                        className={`
                          relative flex h-8 items-center justify-between
                          rounded-full px-3 py-1 text-sm font-medium
                          ${orderStatusColors[order.status]}
                          border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                          transition-all duration-200
                          ${
                            isUpdatingOrderStatus
                              ? "opacity-70 cursor-not-allowed"
                              : ""
                          }
                          w-[140px]  width for consistent badge-like appearance
                        `}
                        aria-label={`Order status for order ${order.id}`}
                      >
                        <SelectValue
                          className="flex-grow text-center text-current" // Centers text within SelectValue's available space
                          placeholder="Select Status"
                        >
                          {/* The actual displayed value is rendered directly inside SelectValue by shadcn/ui */}
                          {order.status}
                        </SelectValue>
                        {isUpdatingOrderStatus && (
                          // Position spinner at the end, outside of SelectValue, but still within SelectTrigger
                          <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                        )}
                      </SelectTrigger>
                      <SelectContent
                        position="popper" // ADD THIS PROP TO KEEP DROPDOWN FROM SCROLLING
                        className="rounded-lg shadow-lg bg-popover"
                      >
                        {orderStatusOptions.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className={`
                              ${orderStatusColors[status]}
                              rounded-md text-sm font-medium my-1
                              focus:bg-opacity-80 focus:text-opacity-90
                              transition-all duration-150
                            `}
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Status Dropdown - FIXED UI ALIGNMENT AND COLORS */}
                  <div>
                    <p className="text-muted-foreground mb-1">
                      Payment Status:
                    </p>
                    <Select
                      value={order.paymentStatus}
                      onValueChange={(newStatus: PaymentStatus) =>
                        handleUpdateStatus("paymentStatus", newStatus)
                      }
                      disabled={
                        isUpdatingPaymentStatus || loadingOrder || !order
                      }
                    >
                      <SelectTrigger
                        className={`
                          relative flex h-8 items-center justify-between
                          rounded-full px-3 py-1 text-sm font-medium
                          ${paymentStatusColors[order.paymentStatus]}
                          border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                          transition-all duration-200
                          ${
                            isUpdatingPaymentStatus
                              ? "opacity-70 cursor-not-allowed"
                              : ""
                          }
                          w-[140px] width for consistent badge-like appearance
                        `}
                        aria-label={`Payment status for order ${order.id}`}
                      >
                        <SelectValue
                          className="flex-grow text-center text-current" // Centers text within SelectValue's available space
                          placeholder="Select Status"
                        >
                          {/* The actual displayed value is rendered directly inside SelectValue by shadcn/ui */}
                          {order.paymentStatus}
                        </SelectValue>
                        {isUpdatingPaymentStatus && (
                          // Position spinner at the end, outside of SelectValue, but still within SelectTrigger
                          <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                        )}
                      </SelectTrigger>
                      <SelectContent
                        position="popper" // ADD THIS PROP TO KEEP DROPDOWN FROM SCROLLING
                        className="rounded-lg shadow-lg bg-popover"
                      >
                        {paymentStatusOptions.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className={`
                              ${paymentStatusColors[status]}
                              rounded-md my-1 text-sm font-medium
                              focus:bg-opacity-80 focus:text-opacity-90
                              transition-all duration-150
                            `}
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Payment Method:</p>
                    <span className="font-medium text-foreground flex items-center">
                      <Wallet className="h-4 w-4 mr-1 text-muted-foreground" />
                      {order.paymentMethod || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment ID:</p>
                    <span className="font-medium text-foreground break-all">
                      {order.paymentId || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created At:</p>
                    <span className="font-medium text-foreground flex items-center">
                      <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated At:</p>
                    <span className="font-medium text-foreground flex items-center">
                      <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      {formatDate(order.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="mb-8 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-secondary-foreground" />{" "}
                    Order Items
                  </CardTitle>
                  <CardDescription>
                    Products included in this order.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRelatedDetails ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Ordered At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...Array(3)].map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-12" />
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
                  ) : order.items && order.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Ordered At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => {
                          const product = productDetailsMap.get(item.productId);
                          const variant = item.variantId
                            ? variantDetailsMap.get(item.variantId)
                            : null;
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {product?.name || item.productName || "N/A"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {variant?.name || "N/A"}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatCurrency(item.totalPrice)}
                              </TableCell>
                              <TableCell>
                                {formatDate(item.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="hover:bg-primary"
                                    onClick={() =>
                                      handleViewProductDetails(item.productId)
                                    }
                                    disabled={
                                      loadingRelatedDetails || !item.productId
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-1" /> Product
                                  </Button>
                                  {item.variantId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hover:bg-primary"
                                      onClick={() =>
                                        handleViewVariantDetails(
                                          item.variantId!
                                        )
                                      }
                                      disabled={
                                        loadingRelatedDetails ||
                                        !item.variantId
                                      }
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
                      No items found for this order.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="mb-8 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-secondary-foreground" />{" "}
                    Shipping Address
                  </CardTitle>
                  <CardDescription>
                    Where the order will be shipped.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.phone || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Street:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.street || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">City:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.city || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">State:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.state || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Zip Code:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.zip || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Country:</p>
                    <span className="font-medium text-foreground">
                      {order.shippingAddress?.country || "N/A"}
                    </span>
                  </div>
                  {!order.shippingAddress?.city &&
                    !order.shippingAddress?.pin &&
                    !order.shippingAddress?.street &&
                    !order.shippingAddress?.state &&
                    !order.shippingAddress?.country && (
                      <div className="md:col-span-2 text-muted-foreground">
                        No shipping address details available.
                      </div>
                    )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-secondary-foreground" />{" "}
                    Billing Address
                  </CardTitle>
                  <CardDescription>Address used for billing.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.phone || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Street:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.street || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">City:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.city || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">State:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.state || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Zip Code:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.zip || "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Country:</p>
                    <span className="font-medium text-foreground">
                      {order.billingAddress?.country || "N/A"}
                    </span>
                  </div>
                  {!order.billingAddress?.city &&
                    !order.billingAddress?.pin &&
                    !order.billingAddress?.street &&
                    !order.billingAddress?.state &&
                    !order.billingAddress?.country && (
                      <div className="md:col-span-2 text-muted-foreground">
                        No billing address details available.
                      </div>
                    )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;