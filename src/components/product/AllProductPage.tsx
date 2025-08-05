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
  Eye, // For 'View Product Details'
  Info, // For error/empty state (remains for "No products found" scenario)
  Plus, // For Add Product
  Edit, // For Edit Product
  Trash2, // For Delete Product
  CheckCircle, // For COD status
  XCircle, // For COD status
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Added motion import

// --- Type Definitions ---

interface AdditionalDetails {
  [key: string]: string; // Changed to string as values will be input as strings
}

// Interface for dynamic key-value pairs in forms
interface KeyValuePair {
  id: string; // Unique ID for React list key
  key: string;
  value: string;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  // ... other fields if needed
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  // ... other fields if needed
}

interface ProductImage {
  id: string;
  url: string;
  // ... other fields if needed
}

interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  // ... other fields if needed
}

interface ProductVariant {
  id: string;
  name: string;
  value: { [key: string]: string }; // e.g., { color: "black", size: "M" }
  price: number;
  stock: number;
  // ... other fields if needed
}

// Main Product interface
export interface Product {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: AdditionalDetails; // Optional, as per API response
  price: number;
  COD: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null; // Can be null if product is not in a subcategory
  // Relations - these are included in the API response when includeRelations=true
  cartItems?: CartItem[];
  orderItems?: OrderItem[];
  images?: ProductImage[];
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  subCategory?: {
    // Nested subCategory object
    id: string;
    name: string;
    // ... other subCategory fields if needed for display
  };
}

export interface ProductsData {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductsApiResponse extends ApiResponse {
  data: ProductsData;
}

// For subcategory filter dropdown options
interface SubCategoryOption {
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
const AllProductPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [subCategoryFilterId, setSubCategoryFilterId] = useState<
    string | "all"
  >("all");
  const [codFilter, setCodFilter] = useState<"all" | "true" | "false">("all");
  const [subCategoriesOptions, setSubCategoriesOptions] = useState<
    SubCategoryOption[]
  >([]); // For subcategory filter dropdown

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Product | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // CRUD operation states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    COD: false,
    subCategoryId: null as string | null,
    additionalDetails: [] as KeyValuePair[],
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock: 0,
    COD: false,
    subCategoryId: null as string | null,
    additionalDetails: [] as KeyValuePair[],
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const token = getAccessToken(); // Assuming you'll use this for auth
  const router = useRouter();

  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Include relations to get subCategory name directly
      const response = await axiosInstance.get<ProductsApiResponse>(
        "/public/product?includeRelations=true"
      );
      const data = response.data.data;
      setAllProducts(data?.products || []);
      setTotalProductsCount(data?.total || 0);
      // Removed setError(null);
    } catch (err: any) {
      setAllProducts([]);
      toast.error(err.message || "Failed to fetch products. Please try again."); // Display toast error
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubCategoriesForForm = useCallback(async () => {
    try {
      const response = await axiosInstance.get<
        ApiResponse<{ subCategories: { id: string; name: string }[] }>
      >("/public/sub-category");
      if (response.data.status === "success" && response.data.data) {
        setSubCategoriesOptions(response.data.data.subCategories || []);
      }
    } catch (err) {
      console.error("Failed to fetch subcategories for form:", err);
      toast.error("Failed to load subcategories for product forms."); // Display toast error
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllProducts();
    fetchSubCategoriesForForm();
  }, [token, router, fetchAllProducts, fetchSubCategoriesForForm]);

  // Memoized filtered and paginated products
  const filteredAndPaginatedProducts = useMemo(() => {
    let currentProducts = [...allProducts];

    // 1. Apply Search Filter
    if (searchQuery) {
      currentProducts = currentProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // 2. Apply SubCategory Filter
    if (subCategoryFilterId !== "all") {
      currentProducts = currentProducts.filter(
        (product) => product.subCategoryId === subCategoryFilterId
      );
    }

    // 3. Apply COD Filter
    if (codFilter !== "all") {
      const isCOD = codFilter === "true";
      currentProducts = currentProducts.filter(
        (product) => product.COD === isCOD
      );
    }

    // 4. Apply Sorting
    if (sortKey) {
      currentProducts.sort((a, b) => {
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

    // 5. Apply Pagination (assuming a fixed items per page for simplicity)
    const productsPerPage = 10;
    const newTotalPages = Math.ceil(currentProducts.length / productsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;

    return currentProducts.slice(startIndex, endIndex);
  }, [
    allProducts,
    searchQuery,
    subCategoryFilterId,
    codFilter,
    sortKey,
    sortDirection,
    currentPage,
  ]); // Dependencies for memoization

  // --- Handlers ---
  const handleRefresh = () => {
    fetchAllProducts();
    fetchSubCategoriesForForm(); // Refresh subcategories as well
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset pagination on search
  };

  const handleSubCategoryFilterChange = (value: string | "all") => {
    setSubCategoryFilterId(value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleCodFilterChange = (value: "all" | "true" | "false") => {
    setCodFilter(value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleSort = (key: keyof Product) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Product) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (productId: string) => {
    router.push(`/product/${productId}`); // Assuming product details page path
  };

  // --- Additional Details Handlers ---
  const handleAddAdditionalDetailField = (formType: "create" | "update") => {
    const newField = { id: crypto.randomUUID(), key: "", value: "" };
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        additionalDetails: [...prev.additionalDetails, newField],
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        additionalDetails: [...prev.additionalDetails, newField],
      }));
    }
  };

  const handleRemoveAdditionalDetailField = (
    formType: "create" | "update",
    idToRemove: string
  ) => {
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        additionalDetails: prev.additionalDetails.filter(
          (detail) => detail.id !== idToRemove
        ),
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        additionalDetails: prev.additionalDetails.filter(
          (detail) => detail.id !== idToRemove
        ),
      }));
    }
  };

  const handleAdditionalDetailChange = (
    formType: "create" | "update",
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    if (formType === "create") {
      setCreateForm((prev) => ({
        ...prev,
        additionalDetails: prev.additionalDetails.map((detail) =>
          detail.id === id ? { ...detail, [field]: newValue } : detail
        ),
      }));
    } else {
      setUpdateForm((prev) => ({
        ...prev,
        additionalDetails: prev.additionalDetails.map((detail) =>
          detail.id === id ? { ...detail, [field]: newValue } : detail
        ),
      }));
    }
  };

  // --- CRUD Handlers ---

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    // Removed setError(null);

    // Validate required fields
    if (!createForm.name.trim()) {
      toast.error("Product Name is required.");
      setIsCreating(false);
      return;
    }
    if (!createForm.description.trim()) {
      toast.error("Description is required.");
      setIsCreating(false);
      return;
    }
    if (createForm.price <= 0) {
      toast.error("Price must be greater than 0.");
      setIsCreating(false);
      return;
    }
    if (createForm.stock < 0) {
      toast.error("Stock cannot be negative.");
      setIsCreating(false);
      return;
    }

    // Additional Details are now always optional, but if added, keys/values must be non-empty
    for (const detail of createForm.additionalDetails) {
      if (
        (detail.key.trim() && !detail.value.trim()) ||
        (!detail.key.trim() && detail.value.trim())
      ) {
        toast.error(
          "Additional Detail fields must have both a key and a value, or be completely empty."
        );
        setIsCreating(false);
        return;
      }
    }

    try {
      // Build additionalDetails object, omitting empty keys
      const additionalDetailsObject: AdditionalDetails = {};
      createForm.additionalDetails.forEach((detail) => {
        if (detail.key.trim()) {
          // Only add if key is not empty
          additionalDetailsObject[detail.key.trim()] = detail.value.trim();
        }
      });

      // Construct payload, conditionally adding fields
      const payload: { [key: string]: any } = {
        name: createForm.name.trim(),
        price: Number(createForm.price),
        stock: Number(createForm.stock),
        COD: Boolean(createForm.COD),
      };

      // Conditionally add description
      if (createForm.description.trim()) {
        payload.description = createForm.description.trim();
      }

      // Conditionally add subCategoryId
      if (
        createForm.subCategoryId !== null &&
        createForm.subCategoryId !== "none"
      ) {
        payload.subCategoryId = createForm.subCategoryId;
      }

      // Conditionally add additionalDetails
      if (Object.keys(additionalDetailsObject).length > 0) {
        payload.additionalDetails = additionalDetailsObject;
      }

      const response = await axiosInstance.post("/admin/product", payload);

      if (response.data.status === "success") {
        toast.success("Product created successfully!");
        setIsCreateDialogOpen(false);
        setCreateForm({
          name: "",
          description: "",
          price: 0,
          stock: 0,
          COD: false,
          subCategoryId: null,
          additionalDetails: [], // Reset to empty array
          // Removed areAdditionalDetailsRequired
        });
        fetchAllProducts(); // Refresh list
      } else {
        toast.error(response.data.message || "Failed to create product.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during creation.");
      toast.error(err.response?.data?.message || "Error creating product.");
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (product: Product) => {
    // Convert additionalDetails object to array of key-value pairs for form
    const additionalDetailsArray: KeyValuePair[] = product.additionalDetails
      ? Object.entries(product.additionalDetails).map(([key, value]) => ({
          id: crypto.randomUUID(), // Assign a unique ID for React list key
          key: key,
          value: String(value), // Ensure value is string
        }))
      : [];

    setUpdateForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      COD: product.COD,
      subCategoryId: product.subCategoryId,
      additionalDetails: additionalDetailsArray,
      // Removed areAdditionalDetailsRequired
    });
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    // Removed setError(null);

    // Validate required fields
    if (!updateForm.name.trim()) {
      toast.error("Product Name is required.");
      setIsUpdating(false);
      return;
    }
    if (!updateForm.description.trim()) {
      toast.error("Description is required.");
      setIsUpdating(false);
      return;
    }
    if (updateForm.price <= 0) {
      toast.error("Price must be greater than 0.");
      setIsUpdating(false);
      return;
    }
    if (updateForm.stock < 0) {
      toast.error("Stock cannot be negative.");
      setIsUpdating(false);
      return;
    }

    // Additional Details are now always optional, but if added, keys/values must be non-empty
    for (const detail of updateForm.additionalDetails) {
      if (
        (detail.key.trim() && !detail.value.trim()) ||
        (!detail.key.trim() && detail.value.trim())
      ) {
        toast.error(
          "Additional Detail fields must have both a key and a value, or be completely empty."
        );
        setIsUpdating(false);
        return;
      }
    }

    try {
      // Build additionalDetails object, omitting empty keys
      const additionalDetailsObject: AdditionalDetails = {};
      updateForm.additionalDetails.forEach((detail) => {
        if (detail.key.trim()) {
          additionalDetailsObject[detail.key.trim()] = detail.value.trim();
        }
      });

      // Construct payload, conditionally adding fields
      const payload: { [key: string]: any } = {
        name: updateForm.name.trim(),
        price: Number(updateForm.price),
        stock: Number(updateForm.stock),
        COD: Boolean(updateForm.COD),
      };

      // Handle description: send null if empty to clear it on backend
      payload.description =
        updateForm.description.trim() === ""
          ? null
          : updateForm.description.trim();

      // Handle subCategoryId: only add if not null and not "none"
      if (
        updateForm.subCategoryId !== null &&
        updateForm.subCategoryId !== "none"
      ) {
        payload.subCategoryId = updateForm.subCategoryId;
      } else {
        // If it's explicitly "none" or null, ensure it's not present in the payload
        // Or if the backend expects null to clear, you could explicitly set it here.
        // For this scenario, we'll just omit it if it's "none" or null.
        // If you need to explicitly send null to clear it on the backend, you would do:
        // payload.subCategoryId = null;
      }

      // Handle additionalDetails: send null if empty to clear it on backend
      payload.additionalDetails =
        Object.keys(additionalDetailsObject).length > 0
          ? additionalDetailsObject
          : null;

      const response = await axiosInstance.patch(
        `/admin/product/${updateForm.id}`,
        payload
      );

      if (response.data.status === "success") {
        toast.success("Product updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllProducts();
      } else {
        toast.error(response.data.message || "Failed to update product.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during update.");
      toast.error(err.response?.data?.message || "Error updating product.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProductClick = (productId: string) => {
    setProductToDeleteId(productId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDeleteId) return;

    setIsDeleting(true);
    // Removed setError(null);
    try {
      const response = await axiosInstance.delete(
        `/admin/product/${productToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Product deleted successfully!");
        setIsDeleteDialogOpen(false);
        setProductToDeleteId(null);
        fetchAllProducts();
      } else {
        toast.error(response.data.message || "Failed to delete product.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during deletion.");
      toast.error(err.response?.data?.message || "Error deleting product.");
    } finally {
      setIsDeleting(false);
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
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Product Management
                </h1>
                <span className="text-muted-foreground">
                  Manage your store's products
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards (Basic placeholder, can be expanded with more metrics) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          {loading ? (
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
                    Total Products
                  </CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalProductsCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Stock
                  </CardTitle>
                  <Boxes className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {allProducts.reduce(
                      (sum, product) => sum + (product.stock || 0),
                      0
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    COD Enabled
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {allProducts.filter((p) => p.COD).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Out of Stock
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {allProducts.filter((p) => p.stock === 0).length}
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
              <div className="relative w-full sm:w-auto sm:flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products by name or description..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2"
                  aria-label="Search products"
                  disabled={loading}
                  maxLength={255} // Max length for search query
                />
              </div>
              {/* Wrapped filters and refresh button in a div with flex-wrap */}
              <div className="w-full sm:w-auto flex flex-wrap gap-4 items-center justify-end">
                {/* SubCategory Filter */}
                <div className="relative flex-grow">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={subCategoryFilterId}
                    onValueChange={handleSubCategoryFilterChange}
                    disabled={loading || subCategoriesOptions.length === 0}
                  >
                    <SelectTrigger className="w-full min-w-[180px] pl-10">
                      <SelectValue placeholder="Filter by subcategory" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {subCategoriesOptions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No subcategories available
                        </SelectItem>
                      ) : (
                        subCategoriesOptions.map((subcat) => (
                          <SelectItem key={subcat.id} value={subcat.id}>
                            {subcat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* COD Filter */}
                <div className="relative flex-grow">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={codFilter}
                    onValueChange={handleCodFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full min-w-[200px] pl-10">
                      <SelectValue placeholder="Filter by COD" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem value="all">All COD Status</SelectItem>
                      <SelectItem value="true">COD Enabled</SelectItem>
                      <SelectItem value="false">COD Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 flex-shrink-0 hover:bg-primary" // Added flex-shrink-0
                  aria-label="Refresh product list"
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

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {loading ? (
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-32" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-48" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
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
                    {[...Array(10)].map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
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
          ) : filteredAndPaginatedProducts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No products found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters, or add a new product.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
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
                        Product Name {renderSortIcon("name")}
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>SubCategory</TableHead>
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
                      <TableHead>COD</TableHead>
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
                    {filteredAndPaginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {product.description || "No description"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.subCategory?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCurrency(product.price)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <Badge
                            className={
                              product.stock === 0
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.COD ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(product.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(product.id)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                              disabled={loading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(product)}
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
                                handleDeleteProductClick(product.id)
                              }
                              disabled={isDeleting || loading}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive border-border"
                            >
                              {isDeleting &&
                              productToDeleteId === product.id ? (
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
        {filteredAndPaginatedProducts.length > 0 && (
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

      {/* Create Product Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setIsCreating(false); // Reset loading state on dialog close
            // Reset form to initial state if dialog is closed without submission
            setCreateForm({
              name: "",
              description: "",
              price: 0,
              stock: 0,
              COD: false,
              subCategoryId: null,
              additionalDetails: [],
              // Removed areAdditionalDetailsRequired
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="createName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createName"
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  disabled={isCreating}
                  required
                  maxLength={255} // Max length for product name
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
                  max="999999.99" // Example: max price value
                  step="0.01" // Allow decimal values for currency
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
                  max="999999" // Example: max stock value
                />
              </div>
              <div>
                <label
                  htmlFor="createSubCategory"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  SubCategory
                </label>
                <Select
                  value={createForm.subCategoryId ?? "none"} // Use "none" for Select if null
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      subCategoryId: value === "none" ? null : value, // Convert back to null if "none" string
                    })
                  }
                  disabled={
                    isCreating || subCategoriesOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <SelectItem value="none">No Subcategory</SelectItem>{" "}
                    {/* Value changed to "none" */}
                    {subCategoriesOptions.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="createDescription"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Description <span className="text-destructive">*</span>{" "}
                  {/* Added required indicator */}
                </label>
                <Textarea
                  id="createDescription"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter product description"
                  disabled={isCreating}
                  required // Made required
                  rows={3}
                  maxLength={2000} // Max length for description
                />
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Additional Details
                </p>
                <div className="space-y-2">
                  {createForm.additionalDetails.map((detail, index) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "create",
                            detail.id,
                            "key",
                            e.target.value
                          )
                        }
                        disabled={isCreating}
                        className="w-1/2"
                        required={!!detail.value.trim()} // Required if value is not empty
                        maxLength={100} // Max length for additional detail key
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "create",
                            detail.id,
                            "value",
                            e.target.value
                          )
                        }
                        disabled={isCreating}
                        className="w-1/2"
                        required={!!detail.key.trim()} // Required if key is not empty
                        maxLength={255} // Max length for additional detail value
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveAdditionalDetailField("create", detail.id)
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
                    onClick={() => handleAddAdditionalDetailField("create")}
                    disabled={isCreating}
                    className="w-full flex items-center gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add Detail Field
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createCOD"
                  checked={createForm.COD}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, COD: e.target.checked })
                  }
                  disabled={isCreating}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label
                  htmlFor="createCOD"
                  className="text-sm font-medium text-foreground"
                >
                  Cash On Delivery (COD) Available
                </label>
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
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Product Dialog */}
      <Dialog
        open={isUpdateDialogOpen}
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) {
            setIsUpdating(false); // Reset loading state on dialog close
            // Reset form to initial state if dialog is closed without submission
            setUpdateForm({
              id: "",
              name: "",
              description: "",
              price: 0,
              stock: 0,
              COD: false,
              subCategoryId: null,
              additionalDetails: [],
              // Removed areAdditionalDetailsRequired
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="updateName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateName"
                  type="text"
                  value={updateForm.name}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  disabled={isUpdating}
                  required
                  maxLength={255} // Max length for product name
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
                  max="999999.99" // Example: max price value
                  step="0.01" // Allow decimal values for currency
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
                  max="999999" // Example: max stock value
                />
              </div>
              <div>
                <label
                  htmlFor="updateSubCategory"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  SubCategory
                </label>
                <Select
                  value={updateForm.subCategoryId ?? "none"} // Use "none" for Select if null
                  onValueChange={(value) =>
                    setUpdateForm({
                      ...updateForm,
                      subCategoryId: value === "none" ? null : value, // Convert back to null if "none" string
                    })
                  }
                  disabled={
                    isUpdating || subCategoriesOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <SelectItem value="none">No Subcategory</SelectItem>{" "}
                    {/* Value changed to "none" */}
                    {subCategoriesOptions.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="updateDescription"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Description <span className="text-destructive">*</span>{" "}
                  {/* Added required indicator */}
                </label>
                <Textarea
                  id="updateDescription"
                  value={updateForm.description}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter product description"
                  disabled={isUpdating}
                  required // Made required
                  rows={3}
                  maxLength={2000} // Max length for description
                />
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Additional Details
                </p>
                <div className="space-y-2">
                  {updateForm.additionalDetails.map((detail, index) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "update",
                            detail.id,
                            "key",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                        className="w-1/2"
                        required={!!detail.value.trim()} // Required if value is not empty
                        maxLength={100} // Max length for additional detail key
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "update",
                            detail.id,
                            "value",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                        className="w-1/2"
                        required={!!detail.key.trim()} // Required if key is not empty
                        maxLength={255} // Max length for additional detail value
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveAdditionalDetailField("update", detail.id)
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
                    onClick={() => handleAddAdditionalDetailField("update")}
                    disabled={isUpdating}
                    className="w-full flex items-center gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add Detail Field
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="updateCOD"
                  checked={updateForm.COD}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, COD: e.target.checked })
                  }
                  disabled={isUpdating}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label
                  htmlFor="updateCOD"
                  className="text-sm font-medium text-foreground"
                >
                  Cash On Delivery (COD) Available
                </label>
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
                  "Update Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setIsDeleting(false); // Reset loading state on dialog close
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this product? This action cannot
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
                onClick={handleConfirmDeleteProduct}
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

export default AllProductPage;
