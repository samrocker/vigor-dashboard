"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Package,
  DollarSign,
  Boxes,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye,
  Info,
  Plus,
  Edit,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import { AxiosError } from "axios"; // Import AxiosError for type checking

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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions ---

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

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

export interface Variant {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  cartItems?: any[];
  orderItems?: any[];
  product?: ProductForVariant;
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

interface ProductOption {
  id: string;
  name: string;
}

// NEW: Form Error Types
type FormErrors = {
  productId?: string;
  name?: string;
  price?: string;
  stock?: string;
  value?: string;
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

// NEW: Centralized API Error Handler
const handleApiError = (
  error: any,
  context: "fetching" | "creating" | "updating" | "deleting"
) => {
  const axiosError = error as AxiosError<ApiResponse>;
  console.error(`API Error during ${context}:`, axiosError);

  if (axiosError.response) {
    const { status, data } = axiosError.response;
    const message = data?.message || "An unknown error occurred.";

    switch (status) {
      case 400:
        toast.error(`Validation Error: ${message}`);
        break;
      case 401:
        toast.error("Authentication failed. Please log in again.");
        break;
      case 403:
        toast.error("You don't have permission to perform this action.");
        break;
      case 404:
        toast.error(
          `The resource could not be found. It might have been deleted.`
        );
        break;
      case 500:
        toast.error("A server error occurred. Please try again later.");
        break;
      default:
        toast.error(`Error: ${message}`);
        break;
    }
  } else if (axiosError.request) {
    toast.error("Network error. Please check your connection and try again.");
  } else {
    toast.error(`An unexpected error occurred while ${context} the variant.`);
  }
};

// --- Component ---
const AllVariantsPage = () => {
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVariantsCount, setTotalVariantsCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilterId, setProductFilterId] = useState<string | "all">("all");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Variant | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // CRUD operation states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    productId: "",
    name: "",
    value: [] as KeyValuePair[],
    price: 0,
    stock: 0,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createFormErrors, setCreateFormErrors] = useState<FormErrors>({}); // NEW

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    value: [] as KeyValuePair[],
    price: 0,
    stock: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFormErrors, setUpdateFormErrors] = useState<FormErrors>({}); // NEW

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantToDeleteId, setVariantToDeleteId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const token = getAccessToken();
  const router = useRouter();

  const fetchAllVariants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<VariantsApiResponse>(
        "/public/variant?includeRelations=true"
      );
      const data = response.data.data;
      setAllVariants(data?.variants || []);
      setTotalVariantsCount(data?.total || 0);
    } catch (err: any) {
      setAllVariants([]);
      handleApiError(err, "fetching"); // UPDATED
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductOptions = useCallback(async () => {
    try {
      const response = await axiosInstance.get<
        ApiResponse<{ products: { id: string; name: string }[] }>
      >("/public/product");
      if (response.data.status === "success" && response.data.data) {
        setProductOptions(response.data.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch product options for form:", err);
      toast.error("Failed to load product options for variant forms.");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllVariants();
    fetchProductOptions();
  }, [token, router, fetchAllVariants, fetchProductOptions]);

  const filteredAndPaginatedVariants = useMemo(() => {
    let currentVariants = [...allVariants];

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

    if (productFilterId !== "all") {
      currentVariants = currentVariants.filter(
        (variant) => variant.productId === productFilterId
      );
    }

    if (sortKey) {
      currentVariants.sort((a, b) => {
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
  ]);

  const handleRefresh = () => {
    fetchAllVariants();
    fetchProductOptions();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleProductFilterChange = (value: string | "all") => {
    setProductFilterId(value);
    setCurrentPage(1);
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
    router.push(`/variant/${variantId}`);
  };

  const handleAddValueField = (formType: "create" | "update") => {
    const newField = { id: crypto.randomUUID(), key: "", value: "" };
    if (formType === "create") {
      setCreateForm((prev) => ({ ...prev, value: [...prev.value, newField] }));
    } else {
      setUpdateForm((prev) => ({ ...prev, value: [...prev.value, newField] }));
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
    const setter = formType === "create" ? setCreateForm : setUpdateForm;
    setter((prev: any) => ({
      ...prev,
      value: prev.value.map((detail: KeyValuePair) =>
        detail.id === id ? { ...detail, [field]: newValue } : detail
      ),
    }));
  };

  // NEW: Form Validation Function
  const validateVariantForm = (
    form: typeof createForm | typeof updateForm,
    isUpdate = false
  ): FormErrors => {
    const errors: FormErrors = {};

    if (!isUpdate && !(form as typeof createForm).productId) {
      errors.productId = "A product must be selected.";
    }
    if (!form.name.trim()) {
      errors.name = "Variant name is required.";
    }
    if (form.price < 0) {
      errors.price = "Price cannot be negative.";
    }
    if (form.stock < 0 || !Number.isInteger(form.stock)) {
      errors.stock = "Stock must be a non-negative integer.";
    }

    const hasAtLeastOneDetail = form.value.some(
      (d) => d.key.trim() && d.value.trim()
    );
    if (!hasAtLeastOneDetail) {
      errors.value =
        "At least one complete key-value pair is required (e.g., color: red).";
    }
    for (const detail of form.value) {
      if (
        (detail.key.trim() && !detail.value.trim()) ||
        (!detail.key.trim() && detail.value.trim())
      ) {
        errors.value = "All fields must have both a key and a value.";
        break;
      }
    }
    return errors;
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormErrors({});

    const validationErrors = validateVariantForm(createForm);
    if (Object.keys(validationErrors).length > 0) {
      setCreateFormErrors(validationErrors);
      return;
    }

    setIsCreating(true);
    try {
      const valueObject: { [key: string]: string } = {};
      createForm.value.forEach((detail) => {
        if (detail.key.trim()) {
          valueObject[detail.key.trim()] = detail.value.trim();
        }
      });

      const payload = {
        productId: createForm.productId,
        name: createForm.name.trim(),
        price: Number(createForm.price),
        stock: Number(createForm.stock),
        value: valueObject,
      };

      const response = await axiosInstance.post("/admin/variant", payload);
      if (response.data.status === "success") {
        toast.success("Variant created successfully!");
        setIsCreateDialogOpen(false);
        setCreateForm({
          productId: "",
          name: "",
          value: [],
          price: 0,
          stock: 0,
        });
        fetchAllVariants();
      }
    } catch (err: any) {
      handleApiError(err, "creating"); // UPDATED
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (variant: Variant) => {
    const valueArray: KeyValuePair[] = variant.value
      ? Object.entries(variant.value).map(([key, val]) => ({
          id: crypto.randomUUID(),
          key: key,
          value: String(val),
        }))
      : [];

    setUpdateForm({
      id: variant.id,
      name: variant.name,
      value: valueArray,
      price: variant.price,
      stock: variant.stock,
    });
    setUpdateFormErrors({}); // Clear errors on open
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateFormErrors({});

    const validationErrors = validateVariantForm(updateForm, true);
    if (Object.keys(validationErrors).length > 0) {
      setUpdateFormErrors(validationErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsUpdating(true);
    try {
      const valueObject: { [key: string]: string } = {};
      updateForm.value.forEach((detail) => {
        if (detail.key.trim()) {
          valueObject[detail.key.trim()] = detail.value.trim();
        }
      });

      const payload = {
        name: updateForm.name.trim(),
        price: Number(updateForm.price),
        stock: Number(updateForm.stock),
        value: valueObject,
      };

      const response = await axiosInstance.patch(
        `/admin/variant/${updateForm.id}`,
        payload
      );
      if (response.data.status === "success") {
        toast.success("Variant updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllVariants();
      }
    } catch (err: any) {
      handleApiError(err, "updating"); // UPDATED
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteVariantClick = (variantId: string) => {
    setVariantToDeleteId(variantId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteVariant = async () => {
    if (!variantToDeleteId) return;
    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete(
        `/admin/variant/${variantToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Variant deleted successfully!");
        setIsDeleteDialogOpen(false);
        setVariantToDeleteId(null);
        fetchAllVariants();
      }
    } catch (err: any) {
      handleApiError(err, "deleting"); // UPDATED
    } finally {
      setIsDeleting(false);
    }
  };

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
              <Plus className="h-4 w-4 mr-2" /> Add Variant
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
            [...Array(4)].map((_, idx) => (
              <Card key={idx}>
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
              <Card>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Variant Stock
                  </CardTitle>
                  <Boxes className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {allVariants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
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
              <Card>
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
              <div className="w-full sm:w-auto flex flex-wrap gap-4 items-center justify-end">
                <div className="relative flex-grow">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={productFilterId}
                    onValueChange={handleProductFilterChange}
                    disabled={loading || productOptions.length === 0}
                  >
                    <SelectTrigger className="w-full min-w-[180px] pl-10">
                      <SelectValue placeholder="Filter by Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {productOptions.length > 0 &&
                        productOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 flex-shrink-0"
                  aria-label="Refresh variant list"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Variants Table */}
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
                      {[...Array(6)].map((_, i) => (
                        <TableHead key={i}>
                          <Skeleton className="h-4 w-full" />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(10)].map((_, idx) => (
                      <TableRow key={idx}>
                        {[...Array(6)].map((_, i) => (
                          <TableCell key={i}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
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
                        <TableCell>
                          <Badge
                            className={
                              variant.stock === 0
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
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
                              disabled={loading}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(variant)}
                              disabled={loading}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteVariantClick(variant.id)
                              }
                              disabled={isDeleting || loading}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              {isDeleting &&
                              variantToDeleteId === variant.id ? (
                                <>
                                  <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
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
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              variant="outline"
              size="sm"
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
            setIsCreating(false);
            setCreateFormErrors({});
            setCreateForm({
              productId: "",
              name: "",
              value: [],
              price: 0,
              stock: 0,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Variant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVariant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="createProductId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product <span className="text-destructive">*</span>
                </label>
                <Select
                  value={createForm.productId}
                  onValueChange={(v) =>
                    setCreateForm({ ...createForm, productId: v })
                  }
                  disabled={
                    isCreating || productOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createFormErrors.productId && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.productId}
                  </p>
                )}
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
                />
                {createFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.name}
                  </p>
                )}
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
                  min="0"
                />
                {createFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.price}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
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
                  min="0"
                />
                {createFormErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.stock}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Value Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {createForm.value.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key (e.g., Color)"
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
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g., Red)"
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleRemoveValueField("create", detail.id)
                        }
                        disabled={isCreating}
                        className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {createFormErrors.value && (
                    <p className="text-sm text-destructive mt-1">
                      {createFormErrors.value}
                    </p>
                  )}
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Creating...
                  </>
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
            setIsUpdating(false);
            setUpdateFormErrors({});
            setUpdateForm({ id: "", name: "", value: [], price: 0, stock: 0 });
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
                  disabled={isUpdating}
                />
                {updateFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.name}
                  </p>
                )}
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
                  disabled={isUpdating}
                  min="0"
                />
                {updateFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.price}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
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
                  disabled={isUpdating}
                  min="0"
                />
                {updateFormErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.stock}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Value Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {updateForm.value.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key (e.g., Color)"
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
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g., Red)"
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleRemoveValueField("update", detail.id)
                        }
                        disabled={isUpdating}
                        className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {updateFormErrors.value && (
                    <p className="text-sm text-destructive mt-1">
                      {updateFormErrors.value}
                    </p>
                  )}
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </>
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
          if (!open) setIsDeleting(false);
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-1" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
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
