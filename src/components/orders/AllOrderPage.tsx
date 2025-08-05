// app/admin/orders/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ShoppingCart, // Icon for orders
  Truck, // Icon for shipping
  CreditCard, // Icon for payment
  DollarSign, // Icon for total amount
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye, // For 'View Order Details'
  Info, // For error/empty state
  User as UserIcon, // Renamed to avoid conflict with User interface
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";

// Shadcn UI components
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

// Import shadcn/ui Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions ---
export interface ShippingAddress {
  city?: string;
  pin?: string;
  name?: string;
  phone?: string;
  address?: { [key: string]: any };
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingAddress {
  city?: string;
  pin?: string;
  name?: string;
  phone?: string;
  address?: { [key: string]: any };
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

// User interface for fetching user names
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  deletedAt: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User; // Add nested user object
  invoiceUrl?: string | null;
  items?: any[];
}

export interface OrdersData {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrdersApiResponse extends ApiResponse {
  data: OrdersData;
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

// --- Color Mappings ---
// Added 'all' option to the color mappings
const orderStatusColors: Record<OrderStatus | "all", string> = {
  all: "bg-gray-100 text-gray-800", // Neutral color for 'all'
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const paymentStatusColors: Record<PaymentStatus | "all", string> = {
  all: "bg-gray-100 text-gray-800", // Neutral color for 'all'
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
const AdminOrderManagement = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  // New states to track loading for individual order/payment status updates
  const [updatingOrderStatusId, setUpdatingOrderStatusId] = useState<
    string | null
  >(null);
  const [updatingPaymentStatusId, setUpdatingPaymentStatusId] = useState<
    string | null
  >(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    OrderStatus | "all"
  >("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentStatus | "all"
  >("all");

  // Sorting
  const [sortKey, setSortKey] = useState<keyof Order | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const token = getAccessToken();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllOrders();
  }, [token, router]);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<OrdersApiResponse>(
        "/admin/order?includeRelations=true"
      );
      const data = response.data.data;
      setAllOrders(data?.orders || []);
      setTotalOrdersCount(data?.total || 0);
      setError(null);
    } catch (err: any) {
      setAllOrders([]);
      setError(err.message || "Failed to fetch orders. Please try again.");
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering & Sorting Logic ---
  const filteredAndPaginatedOrders = useMemo(() => {
    let currentOrders = [...allOrders];

    // 1. Apply Search Filter (e.g., by Order ID, User ID, City, User Name)
    if (searchQuery) {
      currentOrders = currentOrders.filter(
        (order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.shippingAddress?.city &&
            order.shippingAddress.city
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (order.shippingAddress?.pin &&
            order.shippingAddress.pin.includes(searchQuery)) ||
          (order.user?.name &&
            order.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 2. Apply Order Status Filter
    if (orderStatusFilter !== "all") {
      currentOrders = currentOrders.filter(
        (order) => order.status === orderStatusFilter
      );
    }

    // 3. Apply Payment Status Filter
    if (paymentStatusFilter !== "all") {
      currentOrders = currentOrders.filter(
        (order) => order.paymentStatus === paymentStatusFilter
      );
    }

    // 4. Apply Sorting
    if (sortKey) {
      currentOrders.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        if (sortKey === "createdAt" || sortKey === "updatedAt") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }

    // 5. Apply Pagination
    const ordersPerPage = 10;
    const newTotalPages = Math.ceil(currentOrders.length / ordersPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;

    return currentOrders.slice(startIndex, endIndex);
  }, [
    allOrders,
    searchQuery,
    orderStatusFilter,
    paymentStatusFilter,
    sortKey,
    sortDirection,
    currentPage,
  ]);

  // --- Handlers ---
  const handleRefresh = () => {
    // Reset filters and fetch all orders again
    setSearchQuery("");
    setOrderStatusFilter("all");
    setPaymentStatusFilter("all");
    setCurrentPage(1);
    setSortKey("createdAt");
    setSortDirection("desc");
    fetchAllOrders();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleOrderStatusFilterChange = (value: OrderStatus | "all") => {
    setOrderStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePaymentStatusFilterChange = (value: PaymentStatus | "all") => {
    setPaymentStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Order) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Order) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  // Generic handler for updating order status or payment status
  const handleUpdateStatus = async (
    orderId: string,
    field: "status" | "paymentStatus",
    newValue: OrderStatus | PaymentStatus
  ) => {
    if (field === "status") {
      setUpdatingOrderStatusId(orderId);
    } else {
      setUpdatingPaymentStatusId(orderId);
    }

    try {
      const payload = { [field]: newValue };
      const response = await axiosInstance.patch<ApiResponse>(
        `/admin/order/${orderId}`,
        payload
      );

      if (response.data.status === "success") {
        setAllOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, [field]: newValue as any }
              : order
          )
        );
        toast.success(
          `Order ${orderId} ${
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
        setUpdatingOrderStatusId(null);
      } else {
        setUpdatingPaymentStatusId(null);
      }
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-background">
      {/* Removed ToastContainer */}

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
                  Order Management
                </h1>
                <p className="text-muted-foreground">
                  View and manage customer orders
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Orders
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {totalOrdersCount}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      allOrders.reduce(
                        (sum, order) => sum + order.totalAmount,
                        0
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending/Processing Orders
                </CardTitle>
                <Truck className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-orange-500">
                    {
                      allOrders.filter(
                        (order) =>
                          order.status === "PENDING" ||
                          order.status === "PROCESSING" ||
                          order.status === "CONFIRMED"
                      ).length
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivered Orders
                </CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      allOrders.filter((order) => order.status === "DELIVERED")
                        .length
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Controls: Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search Input */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by Order ID, User ID, City, Pin, or User Name..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input focus:ring-2 focus:ring-primary"
                  aria-label="Search orders"
                  disabled={loading}
                 maxLength={255} // Added max length for search query input
                />
              </div>

              {/* Filters and Refresh */}
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-[650px]">
                {/* Order Status Filter */}
                <div className="relative w-full">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Select
                    value={orderStatusFilter}
                    onValueChange={handleOrderStatusFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger
                      className={`
                        w-full h-10 text-sm rounded-md border border-input bg-background focus:ring-2 focus:ring-primary
                        pl-10 pr-4 py-2
                        ${orderStatusColors[orderStatusFilter]}
                        hover:bg-opacity-80 // Apply hover effect that keeps the color but makes it slightly transparent
                      `}
                      aria-label="Filter by order status"
                    >
                      <SelectValue placeholder="All Order Statuses" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md shadow-lg bg-popover">
                      <SelectItem
                        value="all"
                        className={`rounded-md text-sm font-medium my-1
                            focus:bg-opacity-80 focus:text-opacity-90 ${orderStatusColors.all}
                            hover:bg-opacity-80 // Ensure consistency on hover for individual items as well
                            transition-all duration-150`}
                      >
                        All Order Statuses
                      </SelectItem>
                      {orderStatusOptions.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className={`
                            ${orderStatusColors[status]}
                            rounded-md text-sm font-medium my-1
                            focus:bg-opacity-80 focus:text-opacity-90
                            hover:bg-opacity-80 // Ensure consistency on hover for individual items as well
                            transition-all duration-150
                          `}
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="relative w-full">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Select
                    value={paymentStatusFilter}
                    onValueChange={handlePaymentStatusFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger
                      className={`
                        w-full h-10 text-sm rounded-md border border-input bg-background focus:ring-2 focus:ring-primary
                        pl-10 pr-4 py-2
                        ${paymentStatusColors[paymentStatusFilter]}
                        hover:bg-opacity-80 // Apply hover effect that keeps the color but makes it slightly transparent
                      `}
                      aria-label="Filter by payment status"
                    >
                      <SelectValue placeholder="All Payment Statuses" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md shadow-lg bg-popover">
                      <SelectItem
                        value="all"
                        className={`rounded-sm my-1 text-sm font-medium
                            focus:bg-opacity-80 focus:text-opacity-90 ${paymentStatusColors.all}
                            hover:bg-opacity-80 // Ensure consistency on hover for individual items as well
                            transition-all duration-150`}
                      >
                        All Payment Statuses
                      </SelectItem>
                      {paymentStatusOptions.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className={`
                            ${paymentStatusColors[status]}
                            rounded-sm my-1 text-sm font-medium
                            focus:bg-opacity-80 focus:text-opacity-90
                            hover:bg-opacity-80 // Ensure consistency on hover for individual items as well
                            transition-all duration-150
                          `}
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Refresh Button */}
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="w-full sm:w-auto h-10 px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Refresh order list"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-destructive bg-destructive/10 mb-6">
              <CardContent className="pt-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-destructive" />
                <p className="text-destructive-foreground">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Orders Table */}
        {loading && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Shipping City</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-32 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-32 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
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
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredAndPaginatedOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No orders found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("totalAmount")}
                      >
                        Amount {renderSortIcon("totalAmount")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("status")}
                      >
                        Order Status {renderSortIcon("status")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("paymentStatus")}
                      >
                        Payment Status {renderSortIcon("paymentStatus")}
                      </TableHead>
                      <TableHead>Shipping City</TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Date {renderSortIcon("createdAt")}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndPaginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {order.user?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-foreground font-semibold">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        {/* Order Status Dropdown */}
                        <TableCell>
                          <div className="relative flex items-center w-[140px]">
                            <Select
                              value={order.status}
                              onValueChange={(newStatus: OrderStatus) =>
                                handleUpdateStatus(
                                  order.id,
                                  "status",
                                  newStatus
                                )
                              }
                              disabled={
                                updatingOrderStatusId === order.id || loading
                              }
                            >
                              <SelectTrigger
                                className={`
                                  w-full h-8 text-sm font-medium rounded-full px-3 py-1
                                  ${orderStatusColors[order.status]}
                                  border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                  transition-all duration-200
                                  ${
                                    updatingOrderStatusId === order.id
                                      ? "opacity-70 cursor-not-allowed"
                                      : ""
                                  }
                                  hover:opacity-90 // Apply hover effect that keeps the color but makes it slightly transparent
                                `}
                                aria-label={`Order status for order ${order.id}`}
                              >
                                <SelectValue
                                  className="text-current" // Ensure text color is from the statusColors map
                                  placeholder="Select Status"
                                />
                                {updatingOrderStatusId === order.id && (
                                  <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                                )}
                              </SelectTrigger>
                              <SelectContent className="rounded-lg shadow-lg bg-popover">
                                {orderStatusOptions.map((status) => (
                                  <SelectItem
                                    key={status}
                                    value={status}
                                    className={`
                                      ${orderStatusColors[status]}
                                      rounded-sm my-1 text-sm font-medium
                                      focus:bg-opacity-80 focus:text-opacity-90
                                      hover:bg-opacity-80
                                      transition-all duration-150
                                    `}
                                  >
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        {/* Payment Status Dropdown */}
                        <TableCell>
                          <div className="relative flex items-center w-[140px]">
                            <Select
                              value={order.paymentStatus}
                              onValueChange={(newStatus: PaymentStatus) =>
                                handleUpdateStatus(
                                  order.id,
                                  "paymentStatus",
                                  newStatus
                                )
                              }
                              disabled={
                                updatingPaymentStatusId === order.id || loading
                              }
                            >
                              <SelectTrigger
                                className={`
                                  w-full h-8 text-sm font-medium rounded-full px-3 py-1
                                  ${paymentStatusColors[order.paymentStatus]}
                                  border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                  transition-all duration-200
                                  ${
                                    updatingPaymentStatusId === order.id
                                      ? "opacity-70 cursor-not-allowed"
                                      : ""
                                  }
                                  hover:opacity-90 // Apply hover effect that keeps the color but makes it slightly transparent
                                `}
                                aria-label={`Payment status for order ${order.id}`}
                              >
                                <SelectValue
                                  className="text-current" // Ensure text color is from the statusColors map
                                  placeholder="Select Status"
                                />
                                {updatingPaymentStatusId === order.id && (
                                  <LoadingSpinner className="h-3 w-3 text-current ml-2" />
                                )}
                              </SelectTrigger>
                              <SelectContent className="rounded-lg shadow-lg bg-popover">
                                {paymentStatusOptions.map((status) => (
                                  <SelectItem
                                    key={status}
                                    value={status}
                                    className={`
                                      ${paymentStatusColors[status]}
                                      rounded-sm my-1 text-sm font-medium
                                      focus:bg-opacity-80 focus:text-opacity-90
                                      hover:bg-opacity-80 // Ensure consistency on hover for individual items as well
                                      transition-all duration-150
                                    `}
                                  >
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {order.shippingAddress?.city || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center space-x-1">
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(order.id)}
                            className="hover:text-primary hover:bg-primary/10 border-border"
                            disabled={loading}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pagination */}
        {filteredAndPaginatedOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"
          >
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
              variant="outline"
              size="sm"
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm sm:text-base">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || loading}
              variant="outline"
              size="sm"
              aria-label="Next page"
            >
              Next
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderManagement;