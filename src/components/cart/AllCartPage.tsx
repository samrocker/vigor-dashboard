"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ShoppingCart, // Icon for carts
  User as UserIcon, // Icon for user
  DollarSign, // For total amount
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye, // For 'View Cart Details'
  Info, // For error/empty state
  Package, // For product in cart item
  Type, // For variant in cart item
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
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Type Definitions ---

// User interface for fetching user names
interface UserForCart {
  id: string;
  name: string;
  email: string;
}

// Product interface for fetching product names
interface ProductForCartItem {
  id: string;
  name: string;
}

// Variant interface for fetching variant names
interface VariantForCartItem {
  id: string;
  name: string;
  value: { [key: string]: string };
}

// Cart Item interface
interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  product?: ProductForCartItem; // Included when includeRelations=true
  variant?: VariantForCartItem; // Included when includeRelations=true
}

// Main Cart interface
export interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[]; // Array of cart items
  user?: UserForCart; // Included when includeRelations=true
}

export interface CartsData {
  carts: Cart[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CartsApiResponse extends ApiResponse {
  data: CartsData;
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
const AllCartsPage = () => {
  const [allCarts, setAllCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCartsCount, setTotalCartsCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting states
  // Updated sortKey type to include derived properties
  const [sortKey, setSortKey] = useState<keyof Cart | 'totalAmount' | 'items' | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const router = useRouter();
  const token = getAccessToken();

  // Fetch all carts
  const fetchAllCarts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch carts with relations for user, product, and variant names
      const response = await axiosInstance.get<CartsApiResponse>(
        "/admin/cart?includeRelations=true"
      );
      const data = response.data.data;
      setAllCarts(data?.carts || []);
      setTotalCartsCount(data?.total || 0);
      setError(null);
    } catch (err: any) {
      setAllCarts([]);
      setError(err.message || "Failed to fetch carts. Please try again.");
      console.error("Fetch carts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch on component mount
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllCarts();
  }, [token, router, fetchAllCarts]);

  // Memoized filtered and paginated carts
  const filteredAndPaginatedCarts = useMemo(() => {
    let currentCarts = [...allCarts];

    // 1. Apply Search Filter
    if (searchQuery) {
      currentCarts = currentCarts.filter((cart) => {
        // Search by Cart ID
        if (cart.id.toLowerCase().includes(searchQuery.toLowerCase()))
          return true;
        // Search by User Name
        if (
          cart.user?.name &&
          cart.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return true;
        // Search by Product Name in cart items
        if (
          cart.items.some(
            (item) =>
              item.product?.name &&
              item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
          return true;
        // Search by Variant Name in cart items
        if (
          cart.items.some(
            (item) =>
              item.variant?.name &&
              item.variant.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
          return true;
        return false;
      });
    }

    // 2. Apply Sorting
    if (sortKey) {
      currentCarts.sort((a, b) => {
        // Handle sorting for 'user' (by name)
        if (sortKey === "user") {
            const nameA = a.user?.name || "";
            const nameB = b.user?.name || "";
            return sortDirection === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }

        // For total amount/items, we need to calculate them first
        if (sortKey === "totalAmount") {
          const totalA = a.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
          const totalB = b.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
          return sortDirection === "asc" ? totalA - totalB : totalB - totalA;
        }
        if (sortKey === "items") { // Sorting by number of items
          const countA = a.items.length;
          const countB = b.items.length;
          return sortDirection === "asc" ? countA - countB : countB - countA;
        }
        
        // Handle other direct properties of Cart
        const aValue = a[sortKey as keyof Cart]; // Cast to keyof Cart for direct property access
        const bValue = b[sortKey as keyof Cart]; // Cast to keyof Cart for direct property access

        // Handle null/undefined values for sorting
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
        return 0; // Should not happen for defined sort keys
      });
    }

    // 3. Apply Pagination (assuming a fixed items per page for simplicity)
    const cartsPerPage = 10;
    const newTotalPages = Math.ceil(currentCarts.length / cartsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * cartsPerPage;
    const endIndex = startIndex + cartsPerPage;

    return currentCarts.slice(startIndex, endIndex);
  }, [
    allCarts,
    searchQuery,
    sortKey,
    sortDirection,
    currentPage,
  ]);

  // --- Handlers ---
  const handleRefresh = () => {
    fetchAllCarts();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset pagination on search
  };

  const handleSort = (key: keyof Cart | 'totalAmount' | 'items' | 'user') => { // Updated parameter type
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key); // No casting needed here after type update
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Cart | 'totalAmount' | 'items' | 'user') => { // Updated parameter type
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (cartId: string) => {
    router.push(`/cart/${cartId}`); // Navigate to cart details page
  };

  // --- Render ---
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
                  Cart Management
                </h1>
                <p className="text-muted-foreground">
                  View and manage customer shopping carts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Carts
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalCartsCount}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Items in Carts
              </CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {allCarts.reduce(
                  (sum, cart) =>
                    sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
                  0
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value of Carts
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  allCarts.reduce(
                    (sum, cart) =>
                      sum +
                      cart.items.reduce(
                        (itemSum, item) => itemSum + item.quantity * item.price,
                        0
                      ),
                    0
                  )
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Carts
              </CardTitle>
              <UserIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {allCarts.filter(cart => cart.items.length > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls: Search and Refresh */}
        <Card className="mb-8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Cart ID, User Name, Product Name, or Variant Name..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2"
                aria-label="Search carts"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
                aria-label="Refresh cart list"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="pt-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-destructive" />
              <p className="text-destructive-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Carts Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="ml-3 text-muted-foreground">Loading carts...</p>
          </div>
        ) : filteredAndPaginatedCarts.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No carts found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Adjust your search or refresh the list.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Removed Cart ID TableHead */}
                    <TableHead>
                      <span
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("user")} // Sort by user name (conceptually)
                      >
                        User Name {renderSortIcon("user")}
                      </span>
                    </TableHead>
                    <TableHead>
                      <span
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("items")} // Sort by number of items
                      >
                        Total Items {renderSortIcon("items")}
                      </span>
                    </TableHead>
                    <TableHead>
                      <span
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("totalAmount")} // Sort by calculated total amount
                      >
                        Total Amount {renderSortIcon("totalAmount")}
                      </span>
                    </TableHead>
                    <TableHead>
                      <span
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created {renderSortIcon("createdAt")}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndPaginatedCarts.map((cart) => (
                    <TableRow key={cart.id}>
                      {/* Removed Cart ID TableCell */}
                      <TableCell className="text-foreground font-medium">
                        {cart.user?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cart.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-foreground font-semibold">
                        {formatCurrency(
                          cart.items.reduce(
                            (sum, item) => sum + item.quantity * item.price,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(cart.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(cart.id)}
                          className="hover:text-primary hover:bg-primary/10 border-border"
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
        )}

        {/* Pagination */}
        {filteredAndPaginatedCarts.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AllCartsPage;
