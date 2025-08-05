"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ShoppingCart,
  User as UserIcon,
  DollarSign,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye,
  Info, // Kept for "No carts found" scenario, as it's a specific empty state.
  Package,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion"; // AnimatePresence still relevant for table rows

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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner"; // For toast notifications

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
  product?: ProductForCartItem;
  variant?: VariantForCartItem;
}

// Main Cart interface
export interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  user?: UserForCart;
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

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

// --- Skeleton Loading Components ---
const SkeletonCard = () => (
  <motion.div variants={cardVariants}>
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-gray-200 rounded" />
      </CardContent>
    </Card>
  </motion.div>
);

const SkeletonTableRow = () => (
  <motion.tr variants={tableRowVariants}>
    <td>
      <div className="h-4 w-32 bg-gray-200 rounded" />
    </td>
    <td>
      <div className="h-4 w-16 bg-gray-200 rounded" />
    </td>
    <td>
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </td>
    <td>
      <div className="h-4 w-36 bg-gray-200 rounded" />
    </td>
    <td className="text-right">
      <div className="h-8 w-16 bg-gray-200 rounded ml-auto" />
    </td>
  </motion.tr>
);

// --- Component ---
const AllCartsPage = () => {
  const [allCarts, setAllCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCartsCount, setTotalCartsCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting states
  const [sortKey, setSortKey] = useState<
    keyof Cart | "totalAmount" | "items" | null
  >("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const router = useRouter();
  const token = getAccessToken();

  // Fetch all carts
  const fetchAllCarts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<CartsApiResponse>(
        "/admin/cart?includeRelations=true"
      );
      const data = response.data.data;
      setAllCarts(data?.carts || []);
      setTotalCartsCount(data?.total || 0);
      // Removed setError(null);
    } catch (err: any) {
      setAllCarts([]);
      toast.error(err.message || "Failed to fetch carts. Please try again."); // Display toast error
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
        if (cart.id.toLowerCase().includes(searchQuery.toLowerCase()))
          return true;
        if (
          cart.user?.name &&
          cart.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return true;
        if (
          cart.items.some(
            (item) =>
              item.product?.name &&
              item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
          return true;
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
        if (sortKey === "user") {
          const nameA = a.user?.name || "";
          const nameB = b.user?.name || "";
          return sortDirection === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        if (sortKey === "totalAmount") {
          const totalA = a.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
          );
          const totalB = b.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
          );
          return sortDirection === "asc" ? totalA - totalB : totalB - totalA;
        }
        if (sortKey === "items") {
          const countA = a.items.length;
          const countB = b.items.length;
          return sortDirection === "asc" ? countA - countB : countB - countA;
        }
        const aValue = a[sortKey as keyof Cart];
        const bValue = b[sortKey as keyof Cart];
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

    // 3. Apply Pagination
    const cartsPerPage = 10;
    const newTotalPages = Math.ceil(currentCarts.length / cartsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * cartsPerPage;
    const endIndex = startIndex + cartsPerPage;

    return currentCarts.slice(startIndex, endIndex);
  }, [allCarts, searchQuery, sortKey, sortDirection, currentPage]);

  // --- Handlers ---
  const handleRefresh = () => {
    fetchAllCarts();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Cart | "totalAmount" | "items" | "user") => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (
    key: keyof Cart | "totalAmount" | "items" | "user"
  ) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (cartId: string) => {
    router.push(`/cart/${cartId}`);
  };

  // --- Render ---
  return (
    <motion.div
      className="min-h-screen bg-background"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div variants={headerVariants} className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                className="p-2 rounded-lg bg-muted"
                whileHover={{ scale: 1.1 }}
              >
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </motion.div>
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
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {loading ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
            variants={containerVariants}
          >
            {[...Array(4)].map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
            variants={containerVariants}
          >
            <motion.div variants={cardVariants} whileHover="hover">
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
            </motion.div>
            <motion.div variants={cardVariants} whileHover="hover">
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
                        sum +
                        cart.items.reduce(
                          (itemSum, item) => itemSum + item.quantity,
                          0
                        ),
                      0
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants} whileHover="hover">
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
            </motion.div>
            <motion.div variants={cardVariants} whileHover="hover">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Carts
                  </CardTitle>
                  <UserIcon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {allCarts.filter((cart) => cart.items.length > 0).length}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Controls: Search and Refresh */}
        <motion.div variants={cardVariants} whileHover="hover">
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
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleRefresh}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-primary"
                    aria-label="Refresh cart list"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Removed Error Message display block */}

        {/* Carts Table */}
        {loading ? (
          <motion.div variants={cardVariants}>
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </TableHead>
                      <TableHead>
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </TableHead>
                      <TableHead>
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </TableHead>
                      <TableHead>
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, index) => (
                      <SkeletonTableRow key={index} />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredAndPaginatedCarts.length === 0 ? (
          <motion.div variants={cardVariants}>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No carts found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or refresh the list.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={cardVariants}>
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <motion.span
                          className="cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("user")}
                          whileHover={{ scale: 1.05 }}
                        >
                          User Name {renderSortIcon("user")}
                        </motion.span>
                      </TableHead>
                      <TableHead>
                        <motion.span
                          className="cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("items")}
                          whileHover={{ scale: 1.05 }}
                        >
                          Total Items {renderSortIcon("items")}
                        </motion.span>
                      </TableHead>
                      <TableHead>
                        <motion.span
                          className="cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("totalAmount")}
                          whileHover={{ scale: 1.05 }}
                        >
                          Total Amount {renderSortIcon("totalAmount")}
                        </motion.span>
                      </TableHead>
                      <TableHead>
                        <motion.span
                          className="cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("createdAt")}
                          whileHover={{ scale: 1.05 }}
                        >
                          Created {renderSortIcon("createdAt")}
                        </motion.span>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredAndPaginatedCarts.map((cart) => (
                        <motion.tr
                          key={cart.id}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
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
                              <span>{formatDate(cart.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(cart.id)}
                                className="hover:text-primary hover:bg-primary/10 border-border"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </motion.div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pagination */}
        {filteredAndPaginatedCarts.length > 0 && (
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"
            variants={containerVariants}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                variant="outline"
                size="sm"
                aria-label="Previous page"
              >
                Previous
              </Button>
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-muted-foreground text-sm sm:text-base"
            >
              Page {currentPage} of {totalPages}
            </motion.span>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AllCartsPage;