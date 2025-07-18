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
  User as UserIcon, // Renamed to avoid conflict with User interface
  DollarSign,
  Truck,
  CreditCard,
  Calendar,
  Info,
  ArrowLeft,
  MapPin, // For address
  Wallet, // For payment method
  Eye, // For view details
  Package, // For product in order item
  Type, // For variant in order item
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import shadcn/ui Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Type Definitions (re-used from AdminOrderManagement or similar) ---
export interface ShippingAddress {
  id?: string; // Added from API response
  userId?: string; // Added from API response
  name?: string; // Added from API response
  phone?: string; // Added from API response
  address?: { [key: string]: any }; // Added from API response
  city?: string;
  pin?: string;
  street?: string; // Added for more complete address
  state?: string;
  zip?: string; // Added zip property
  country?: string;
  isActive?: boolean; // Added from API response
  deletedAt?: string | null; // Added from API response
}

export interface BillingAddress {
  id?: string; // Added from API response
  userId?: string; // Added from API response
  name?: string; // Added from API response
  phone?: string; // Added from API response
  address?: { [key: string]: any }; // Added from API response
  city?: string;
  pin?: string;
  street?: string;
  state?: string;
  zip?: string; // Added zip property
  country?: string;
  isActive?: boolean; // Added from API response
  deletedAt?: string | null; // Added from API response
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

// Product interface for nested product data in order item response
interface ProductForOrderItemDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  // Add other fields from product API response if needed, e.g., imageUrl, additionalDetails
}

// Variant interface for nested variant data in order item response
interface VariantForOrderItemDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

// Order Item interface with relations
interface OrderItemDetails {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number; // Assuming unitPrice from API response
  totalPrice: number; // Assuming totalPrice from API response
  productName: string; // Assuming productName from API response
  productDetails: { [key: string]: any }; // Assuming productDetails from API response
  createdAt: string;
  updatedAt: string;
  // Note: product and variant objects are NOT directly nested in order/:id response for items.
  // We will fetch them separately using productDetailsMap/variantDetailsMap.
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
  items: OrderItemDetails[]; // Array of detailed order items
  user?: User; // Full user object
  shippingAddress?: ShippingAddress; // Full shipping address object
  billingAddress?: BillingAddress; // Full billing address object
}

// API Response for single order
export interface OrderDetailsApiResponse extends ApiResponse {
  data: {
    order: Order;
  };
}

// User interface for fetching user names
interface User {
  id: string;
  name: string;
  email: string;
  // Add other user fields if needed
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
  const [error, setError] = useState<string | null>(null);

  // New states for related product/variant details
  const [productDetailsMap, setProductDetailsMap] = useState<Map<string, ProductForOrderItemDetails>>(new Map());
  const [variantDetailsMap, setVariantDetailsMap] = useState<Map<string, VariantForOrderItemDetails>>(new Map());
  const [loadingRelatedDetails, setLoadingRelatedDetails] = useState<boolean>(false);

  // States for update loading
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  // Fetch user name after order details are loaded and userId is available
  useEffect(() => {
    if (order?.userId) {
      fetchUserName(order.userId);
    }
  }, [order?.userId]);

  // Effect to fetch related product and variant details for order items
  useEffect(() => {
    const fetchRelatedDetails = async () => {
      setLoadingRelatedDetails(true);
      const uniqueProductIds = new Set<string>();
      const uniqueVariantIds = new Set<string>();

      order?.items?.forEach(item => {
        uniqueProductIds.add(item.productId);
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });

      const newProductDetails = new Map<string, ProductForOrderItemDetails>();
      const newVariantDetails = new Map<string, VariantForOrderItemDetails>();

      const productPromises = Array.from(uniqueProductIds).map(async (pId) => {
        try {
          const response = await axiosInstance.get<ApiResponse<{ product: ProductForOrderItemDetails }>>(
            `/public/product/${pId}?includeRelations=true`
          );
          if (response.data.status === "success" && response.data.data?.product) {
            newProductDetails.set(pId, response.data.data.product);
          }
        } catch (err) {
          console.error(`Failed to fetch product ${pId}:`, err);
        }
      });

      const variantPromises = Array.from(uniqueVariantIds).map(async (vId) => {
        try {
          const response = await axiosInstance.get<ApiResponse<{ variant: VariantForOrderItemDetails }>>(
            `/public/variant/${vId}?includeRelations=true`
          );
          if (response.data.status === "success" && response.data.data?.variant) {
            newVariantDetails.set(vId, response.data.data.variant);
          }
        } catch (err) {
          console.error(`Failed to fetch variant ${vId}:`, err);
        }
      });

      await Promise.all([...productPromises, ...variantPromises]);

      setProductDetailsMap(newProductDetails);
      setVariantDetailsMap(newVariantDetails);
      setLoadingRelatedDetails(false);
    };

    if (order?.items && order.items.length > 0) { // Only fetch if order items exist
      fetchRelatedDetails();
    } else if (order) { // If order exists but has no items, stop loading related details
      setLoadingRelatedDetails(false);
    }
  }, [order?.items]); // Re-run when order items change

  const fetchOrderDetails = async (id: string) => {
    setLoadingOrder(true);
    try {
      const response = await axiosInstance.get<OrderDetailsApiResponse>(
        `/admin/order/${id}?includeRelations=true` // Ensure relations are included
      );
      if (response.data.status === "success" && response.data.data?.order) {
        setOrder(response.data.data.order);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch order details.");
        setOrder(null);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred while fetching order details."
      );
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
      }
    } catch (err) {
      console.error(`Failed to fetch user ${userId}:`, err);
      setUserName("Unknown User");
    } finally {
      setLoadingUserName(false);
    }
  };

  // --- New: Handler for updating order status or payment status ---
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
      const payload = { [field]: newValue }; // Dynamic payload based on field
      const response = await axiosInstance.patch<ApiResponse>(
        `/admin/order/${order.id}`,
        payload
      );

      if (response.data.status === "success") {
        // Optimistically update the local order state
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
        setIsUpdatingPaymentStatus(false); // Corrected this to false
      }
    }
  };

  // Navigation handlers
  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewVariantDetails = (variantId: string) => {
    router.push(`/variant/${variantId}`);
  };

  const handleViewUserDetails = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  // --- Render Loading/Error/Not Found States ---
  if (loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
              <Button onClick={() => router.back()} className="mt-4" variant="outline">Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Order not found.</p>
              <Button onClick={() => router.back()} className="mt-4" variant="outline">Go Back</Button>
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
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Order Details
                </h1>
                <p className="text-muted-foreground">Order ID: {order.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="hover:bg-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Information Card */}
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
            {/* Order ID */}
            <div>
              <p className="text-muted-foreground">Order ID:</p>
              <p className="font-medium text-foreground break-all">
                {order.id}
              </p>
            </div>
            {/* User Name */}
            <div>
              <p className="text-muted-foreground">Customer Name:</p>
              <p className="font-medium text-foreground flex items-center">
                {loadingUserName ? (
                  <LoadingSpinner className="h-4 w-4 mr-2 text-primary" />
                ) : (
                  <>
                    <UserIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                    {userName || "N/A"}
                  </>
                )}
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => handleViewUserDetails(order.userId)}
                className="p-0 h-auto text-primary hover:text-primary-foreground"
              >
                View User Details
              </Button>
            </div>
            {/* Total Amount */}
            <div>
              <p className="text-muted-foreground">Total Amount:</p>
              <p className="font-medium text-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                {formatCurrency(order.totalAmount)}
              </p>
            </div>

            {/* Order Status Dropdown */}
            <div>
              <p className="text-muted-foreground mb-1">Order Status:</p>
              <div className="relative flex items-center w-[140px]">
                <Select
                  value={order.status}
                  onValueChange={(newStatus: OrderStatus) =>
                    handleUpdateStatus("status", newStatus)
                  }
                  disabled={isUpdatingOrderStatus}
                >
                  <SelectTrigger
                    className={`
                      w-full h-8 text-sm font-medium rounded-full px-3 py-1
                      ${orderStatusColors[order.status]}
                      border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                      transition-all duration-200
                      ${
                        isUpdatingOrderStatus
                          ? "opacity-70 cursor-not-allowed"
                          : ""
                      }
                    `}
                    aria-label={`Order status for order ${order.id}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <SelectValue
                        className={`${orderStatusColors[order.status]}`}
                        placeholder="Select Status"
                      />
                      {isUpdatingOrderStatus && (
                        <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    {orderStatusOptions.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className={`
                          ${orderStatusColors[status]}
                          rounded-sm mx-1 my-0.5 text-sm font-medium
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
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <p className="text-muted-foreground mb-1">Payment Status:</p>
              <div className="relative flex items-center w-[140px]">
                <Select
                  value={order.paymentStatus}
                  onValueChange={(newStatus: PaymentStatus) =>
                    handleUpdateStatus("paymentStatus", newStatus)
                  }
                  disabled={isUpdatingPaymentStatus}
                >
                  <SelectTrigger
                    className={`
                      w-full h-8 text-sm font-medium rounded-full px-3 py-1
                      ${paymentStatusColors[order.paymentStatus]}
                      border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                      transition-all duration-200
                      ${
                        isUpdatingPaymentStatus
                          ? "opacity-70 cursor-not-allowed"
                          : ""
                      }
                    `}
                    aria-label={`Payment status for order ${order.id}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <SelectValue
                        className={`${paymentStatusColors[order.paymentStatus]}`}
                        placeholder="Select Status"
                      />
                      {isUpdatingPaymentStatus && (
                        <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    {paymentStatusOptions.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className={`
                          ${paymentStatusColors[status]}
                          rounded-sm mx-1 my-0.5 text-sm font-medium
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
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-muted-foreground">Payment Method:</p>
              <p className="font-medium text-foreground flex items-center">
                <Wallet className="h-4 w-4 mr-1 text-muted-foreground" />
                {order.paymentMethod || "N/A"}
              </p>
            </div>
            {/* Payment ID */}
            <div>
              <p className="text-muted-foreground">Payment ID:</p>
              <p className="font-medium text-foreground break-all">
                {order.paymentId || "N/A"}
              </p>
            </div>
            {/* Created At */}
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(order.createdAt)}
              </p>
            </div>
            {/* Updated At */}
            <div>
              <p className="text-muted-foreground">Last Updated At:</p>
              <p className="font-medium text-foreground flex items-center">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(order.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Items Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-secondary-foreground" /> Order Items
            </CardTitle>
            <CardDescription>Products included in this order.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelatedDetails ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner className="h-6 w-6 text-primary" />
                <p className="ml-3 text-muted-foreground">Loading order items...</p>
              </div>
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
                    const variant = item.variantId ? variantDetailsMap.get(item.variantId) : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {product?.name || item.productName || "N/A"}
                        </TableCell>
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
                        <TableCell className="font-semibold">
                          {formatCurrency(item.totalPrice)}
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
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-4">No items found for this order.</div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary-foreground" /> Shipping Address
            </CardTitle>
            <CardDescription>Where the order will be shipped.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.phone || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Street:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.street || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">City:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.city || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">State:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.state || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Zip Code:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.zip || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Country:</p>
              <p className="font-medium text-foreground">
                {order.shippingAddress?.country || "N/A"}
              </p>
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

        {/* Billing Address Card */}
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
              <p className="font-medium text-foreground">
                {order.billingAddress?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.phone || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Street:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.street || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">City:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.city || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">State:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.state || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Zip Code:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.zip || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Country:</p>
              <p className="font-medium text-foreground">
                {order.billingAddress?.country || "N/A"}
              </p>
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
      </div>
    </div>
  );
};

export default OrderDetailsPage;
