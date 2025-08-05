"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Package, // Icon for products
  DollarSign, // For price
  Boxes, // For stock
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye, // For 'View Variant Details'
  Info, // For error/empty state (remains for "No variants found" scenario)
  Plus, // For Add Variant
  Edit, // For Edit Variant
  Trash2, // For Delete Variant
  Type, // For variant value/type
  X, // For removing additional detail fields
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Added motion import

// --- Type Definitions ---

// Interface for dynamic key-value pairs in forms (for variant.value)
interface KeyValuePair {
  id: string; // Unique ID for React list key
  key: string;
  value: string;
}

// Simplified Product interface for nested product data in variant response
interface ProductForVariant {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  COD: boolean;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
}

// Main Variant interface
export interface Variant {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string }; // e.g., { color: "black", size: "M" }
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  cartItems?: any[]; // Simplified, not used for display in this component
  orderItems?: any[]; // Simplified, not used for display in this component
  product?: ProductForVariant; // Full product object if includeRelations=true
}

export interface VariantsData {
  variants: Variant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VariantsApiResponse extends ApiResponse {
  data: VariantsData;
}

// For product filter dropdown options
interface ProductOption {
  id: string;
  name: string;
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
const AllVariantsPage = () => {
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVariantsCount, setTotalVariantsCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilterId, setProductFilterId] = useState<string | "all">("all");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]); // For product filter dropdown

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Variant | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // CRUD operation states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    productId: "",
    name: "",
    value: [] as KeyValuePair[], // Changed to array of KeyValuePair
    price: 0,
    stock: 0,
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    value: [] as KeyValuePair[], // Changed to array of KeyValuePair
    price: 0,
    stock: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantToDeleteId, setVariantToDeleteId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const token = getAccessToken(); // Assuming you'll use this for auth
  const router = useRouter();

  // Fetch all variants
  const fetchAllVariants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<VariantsApiResponse>(
        "/public/variant?includeRelations=true"
      );
      const data = response.data.data;
      setAllVariants(data?.variants || []);
      setTotalVariantsCount(data?.total || 0);
      // Removed setError(null);
    } catch (err: any) {
      setAllVariants([]);
      toast.error(err.message || "Failed to fetch variants. Please try again."); // Display toast error
      console.error("Fetch variants error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch product options for dropdowns
  const fetchProductOptions = useCallback(async () => {
    try {
      const response = await axiosInstance.get<
        ApiResponse<{ products: { id: string; name: string }[] }>
      >("/public/product"); // Assuming public endpoint for product names
      if (response.data.status === "success" && response.data.data) {
        setProductOptions(response.data.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch product options for form:", err);
      toast.error("Failed to load product options for variant forms."); // Display toast error
    }
  }, []);

  // Initial data fetch on component mount
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllVariants();
    fetchProductOptions();
  }, [token, router, fetchAllVariants, fetchProductOptions]);

  // Memoized filtered and paginated variants
  const filteredAndPaginatedVariants = useMemo(() => {
    let currentVariants = [...allVariants];

    // 1. Apply Search Filter (on variant name or associated product name)
    if (searchQuery) {
      currentVariants = currentVariants.filter(
        (variant) =>
          variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (variant.product?.name &&
            variant.product.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // 2. Apply Product Filter
    if (productFilterId !== "all") {
      currentVariants = currentVariants.filter(
        (variant) => variant.productId === productFilterId
      );
    }

    // 3. Apply Sorting
    if (sortKey) {
      currentVariants.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

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

    // 4. Apply Pagination (assuming a fixed items per page for simplicity)
    const variantsPerPage = 10;
    const newTotalPages = Math.ceil(currentVariants.length / variantsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * variantsPerPage;
    const endIndex = startIndex + variantsPerPage;

    return currentVariants.slice(startIndex, endIndex);
  }, [
    allVariants,
    searchQuery,
    productFilterId,
    sortKey,
    sortDirection,
    currentPage,
  ]); // Dependencies for memoization

  // --- Handlers ---
  const handleRefresh = () => {
    fetchAllVariants();
    fetchProductOptions(); // Refresh product options as well
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset pagination on search
  };

  const handleProductFilterChange = (value: string | "all") => {
    setProductFilterId(value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleSort = (key: keyof Variant) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Variant) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (variantId: string) => {
    router.push(`/variant/${variantId}`); // Assuming variant details page path
  };

  // --- Variant Value (Additional Details) Handlers ---
  const handleAddValueField = (formType: "create" | "update") => {
    const newField = { id: crypto.randomUUID(), key: "", value: "" };
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        value: [...prev.value, newField],
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        value: [...prev.value, newField],
      }));
    }
  };

  const handleRemoveValueField = (
    formType: "create" | "update",
    idToRemove: string
  ) => {
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        value: prev.value.filter((detail) => detail.id !== idToRemove),
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        value: prev.value.filter((detail) => detail.id !== idToRemove),
      }));
    }
  };

  const handleValueChange = (
    formType: "create" | "update",
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        value: prev.value.map((detail) =>
          detail.id === id ? { ...detail, [field]: newValue } : detail
        ),
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        value: prev.value.map((detail) =>
          detail.id === id ? { ...detail, [field]: newValue } : detail
        ),
      }));
    }
  };

  // --- CRUD Handlers ---

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    // Removed setError(null);

    // Basic form validation
    if (!createForm.productId) {
      toast.error("Product is required.");
      setIsCreating(false);
      return;
    }
    if (!createForm.name.trim()) {
      toast.error("Variant Name is required.");
      setIsCreating(false);
      return;
    }
    if (createForm.price < 0) {
      toast.error("Price cannot be negative.");
      setIsCreating(false);
      return;
    }
    if (createForm.stock < 0) {
      toast.error("Stock cannot be negative.");
      setIsCreating(false);
      return;
    }

    // Validate Value fields
    for (const detail of createForm.value) {
      if (
        (detail.key.trim() && !detail.value.trim()) ||
        (!detail.key.trim() && detail.value.trim())
      ) {
        toast.error(
          "All Value fields must have both a key and a value, or be completely empty."
        );
        setIsCreating(false);
        return;
      }
    }

    try {
      // Convert array of key-value pairs to a single object for 'value'
      const valueObject: { [key: string]: string } = {};
      createForm.value.forEach((detail) => {
        if (detail.key.trim()) {
          valueObject[detail.key.trim()] = detail.value.trim();
        }
      });

      // Construct payload, conditionally adding 'value' if not empty
      const payload: { [key: string]: any } = {
        productId: createForm.productId,
        name: createForm.name.trim(),
        price: Number(createForm.price),
        stock: Number(createForm.stock),
      };

      if (Object.keys(valueObject).length > 0) {
        payload.value = valueObject;
      }

      const response = await axiosInstance.post("/admin/variant", payload);

      if (response.data.status === "success") {
        toast.success("Variant created successfully!");
        setIsCreateDialogOpen(false);
        setCreateForm({
          productId: "",
          name: "",
          value: [], // Reset to empty array
          price: 0,
          stock: 0,
        });
        fetchAllVariants(); // Refresh list
      } else {
        toast.error(response.data.message || "Failed to create variant.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during creation.");
      toast.error(err.response?.data?.message || "Error creating variant.");
    } finally {
      setIsCreating(false); // <--- IMPORTANT: This ensures loading state is always reset
    }
  };

  const openUpdateDialog = (variant: Variant) => {
    // Convert variant.value object to array of key-value pairs for form
    const valueArray: KeyValuePair[] = variant.value
      ? Object.entries(variant.value).map(([key, val]) => ({
          id: crypto.randomUUID(), // Assign a unique ID for React list key
          key: key,
          value: String(val), // Ensure value is string
        }))
      : [];

    setUpdateForm({
      id: variant.id,
      name: variant.name,
      value: valueArray,
      price: variant.price,
      stock: variant.stock,
    });
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    // Removed setError(null);

    // Basic form validation
    if (!updateForm.name.trim()) {
      toast.error("Variant Name is required.");
      setIsUpdating(false);
      return;
    }
    if (updateForm.price < 0) {
      toast.error("Price cannot be negative.");
      setIsUpdating(false);
      return;
    }
    if (updateForm.stock < 0) {
      toast.error("Stock cannot be negative.");
      setIsUpdating(false);
      return;
    }

    // Validate Value fields
    for (const detail of updateForm.value) {
      if (
        (detail.key.trim() && !detail.value.trim()) ||
        (!detail.key.trim() && detail.value.trim())
      ) {
        toast.error(
          "All Value fields must have both a key and a value, or be completely empty."
        );
        setIsUpdating(false);
        return;
      }
    }

    try {
      // Convert array of key-value pairs to a single object for 'value'
      const valueObject: { [key: string]: string } = {};
      updateForm.value.forEach((detail) => {
        if (detail.key.trim()) {
          valueObject[detail.key.trim()] = detail.value.trim();
        }
      });

      // Construct payload, conditionally adding 'value' if not empty
      const payload: { [key: string]: any } = {
        name: updateForm.name.trim(),
        price: Number(updateForm.price),
        stock: Number(updateForm.stock),
      };

      if (Object.keys(valueObject).length > 0) {
        payload.value = valueObject;
      } else {
        payload.value = null; // Explicitly send null if no values are provided to clear it
      }

      const response = await axiosInstance.patch(
        `/admin/variant/${updateForm.id}`,
        payload
      );

      if (response.data.status === "success") {
        toast.success("Variant updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllVariants(); // Refresh list
      } else {
        toast.error(response.data.message || "Failed to update variant.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during update.");
      toast.error(err.response?.data?.message || "Error updating variant.");
    } finally {
      setIsUpdating(false); // <--- IMPORTANT: This ensures loading state is always reset
    }
  };

  const handleDeleteVariantClick = (variantId: string) => {
    setVariantToDeleteId(variantId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteVariant = async () => {
    if (!variantToDeleteId) return;

    setIsDeleting(true);
    // Removed setError(null);
    try {
      const response = await axiosInstance.delete(
        `/admin/variant/${variantToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Variant deleted successfully!");
        setIsDeleteDialogOpen(false);
        setVariantToDeleteId(null);
        fetchAllVariants();
      } else {
        toast.error(response.data.message || "Failed to delete variant.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during deletion.");
      toast.error(err.response?.data?.message || "Error deleting variant.");
    } finally {
      setIsDeleting(false); // <--- IMPORTANT: This ensures loading state is always reset
    }
  };

  // --- Render ---
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
                  Variant Management
                </h1>
                <span className="text-muted-foreground">
                  Manage different product variations
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          {loading ? (
            // Skeleton for Stats Cards
            [...Array(4)].map((_, idx) => (
              <Card
                key={idx}
                className="hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Variants
                  </CardTitle>
                  <Type className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalVariantsCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Variant Stock
                  </CardTitle>
                  <Boxes className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {allVariants.reduce(
                      (sum, variant) => sum + (variant.stock || 0),
                      0
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unique Products with Variants
                  </CardTitle>
                  <Package className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(allVariants.map((v) => v.productId)).size}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Out of Stock Variants
                  </CardTitle>
                  <Info className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {allVariants.filter((v) => v.stock === 0).length}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>

        {/* Controls: Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-auto flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search variants by name or product name..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2"
                  aria-label="Search variants"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Product Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={productFilterId}
                    onValueChange={handleProductFilterChange}
                    disabled={loading || productOptions.length === 0}
                  >
                    <SelectTrigger className="w-[180px] pl-10">
                      <SelectValue placeholder="Filter by Product" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      {/* Added "All Products" option here */}
                      <SelectItem
                        value="all"
                      >
                        All Products
                      </SelectItem>
                      {productOptions.length === 0 ? (
                        <SelectItem value="no-products" disabled>
                          No products available
                        </SelectItem>
                      ) : (
                        productOptions.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                          >
                            {product.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-label="Refresh variant list"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Removed Error Message component */}

        {/* Variants Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {loading ? (
            // Skeleton for Variants Table
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-32" />
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
                        <Skeleton className="h-4 w-12" />
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
                    {[...Array(5)].map((_, idx) => (
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
                          <Skeleton className="h-4 w-12" />
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
          ) : filteredAndPaginatedVariants.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Type className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No variants found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters, or add a new variant.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("name")}
                      >
                        Variant Name {renderSortIcon("name")}
                      </TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("price")}
                      >
                        Price {renderSortIcon("price")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("stock")}
                      >
                        Stock {renderSortIcon("stock")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created {renderSortIcon("createdAt")}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndPaginatedVariants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">
                          {variant.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {variant.product?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCurrency(variant.price)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <Badge
                            className={
                              variant.stock === 0
                                ? "bg-red-100 hover:bg-red-100 text-red-800"
                                : "bg-blue-100 hover:bg-blue-100 text-blue-800"
                            }
                          >
                            {variant.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(variant.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(variant.id)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                              disabled={loading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(variant)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteVariantClick(variant.id)
                              }
                              disabled={isDeleting || loading}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive border-border"
                            >
                              {isDeleting &&
                              variantToDeleteId === variant.id ? (
                                <div className="flex items-center">
                                  <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                                  Deleting...
                                </div>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Pagination */}
        {filteredAndPaginatedVariants.length > 0 && (
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

      {/* Create Variant Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            // Reset form to initial state when dialog closes
            setCreateForm({
              productId: "",
              name: "",
              value: [],
              price: 0,
              stock: 0,
            });
            // Importantly, the isCreating state should be handled by the form submission's finally block.
            // If the dialog is closed externally (e.g., ESC key), and an API call was somehow still pending,
            // the finally block will correctly reset isCreating.
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Variant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVariant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="createProductId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product <span className="text-destructive">*</span>
                </label>
                <Select
                  value={createForm.productId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, productId: value })
                  }
                  disabled={
                    isCreating || productOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    {productOptions.length === 0 ? (
                      <SelectItem value="no-products" disabled>
                        No products available
                      </SelectItem>
                    ) : (
                      productOptions.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="createName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Variant Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createName"
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g., Black Small"
                  disabled={isCreating}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="createPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createPrice"
                  type="number"
                  value={createForm.price}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      price: Number(e.target.value),
                    })
                  }
                  placeholder="Enter price"
                  disabled={isCreating}
                  required
                  min="0"
                />
              </div>
              <div>
                <label
                  htmlFor="createStock"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Stock <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createStock"
                  type="number"
                  value={createForm.stock}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      stock: Number(e.target.value),
                    })
                  }
                  placeholder="Enter stock quantity"
                  disabled={isCreating}
                  required
                  min="0"
                />
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Value Details
                </p>
                <div className="space-y-2">
                  {createForm.value.map((detail, index) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleValueChange(
                            "create",
                            detail.id,
                            "key",
                            e.target.value
                          )
                        }
                        disabled={isCreating}
                        className="w-1/2"
                        required={!!detail.value.trim()} // Required if value is not empty
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleValueChange(
                            "create",
                            detail.id,
                            "value",
                            e.target.value
                          )
                        }
                        disabled={isCreating}
                        className="w-1/2"
                        required={!!detail.key.trim()} // Required if key is not empty
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveValueField("create", detail.id)
                        }
                        disabled={isCreating}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddValueField("create")}
                    disabled={isCreating}
                    className="w-full flex items-center gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add Value Field
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Creating...
                  </div>
                ) : (
                  "Create Variant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Variant Dialog */}
      <Dialog
        open={isUpdateDialogOpen}
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) {
            // Reset form to initial state when dialog closes
            setUpdateForm({
              id: "",
              name: "",
              value: [],
              price: 0,
              stock: 0,
            });
            // The isUpdating state should be handled by the form submission's finally block.
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateVariant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="updateName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Variant Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateName"
                  type="text"
                  value={updateForm.name}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, name: e.target.value })
                  }
                  placeholder="e.g., Black Small"
                  disabled={isUpdating}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="updatePrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updatePrice"
                  type="number"
                  value={updateForm.price}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      price: Number(e.target.value),
                    })
                  }
                  placeholder="Enter price"
                  disabled={isUpdating}
                  required
                  min="0"
                />
              </div>
              <div>
                <label
                  htmlFor="updateStock"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Stock <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateStock"
                  type="number"
                  value={updateForm.stock}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      stock: Number(e.target.value),
                    })
                  }
                  placeholder="Enter stock quantity"
                  disabled={isUpdating}
                  required
                  min="0"
                />
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Value Details
                </p>
                <div className="space-y-2">
                  {updateForm.value.map((detail, index) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleValueChange(
                            "update",
                            detail.id,
                            "key",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                        className="w-1/2"
                        required={!!detail.value.trim()} // Required if value is not empty
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleValueChange(
                            "update",
                            detail.id,
                            "value",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                        className="w-1/2"
                        required={!!detail.key.trim()} // Required if key is not empty
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveValueField("update", detail.id)
                        }
                        disabled={isUpdating}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddValueField("update")}
                    disabled={isUpdating}
                    className="w-full flex items-center gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add Value Field
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </div>
                ) : (
                  "Update Variant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Variant Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setIsDeleting(false); // <--- Kept this one, as it's not tied to an active API call on dialog close.
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this variant? This action cannot
              be undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteVariant}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllVariantsPage;