"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Package,
  DollarSign,
  Boxes,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye,
  Info,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  UploadCloud,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import { AxiosError } from "axios";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions ---

interface AdditionalDetails {
  [key: string]: string;
}

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

interface ProductImage {
  id: string;
  url: string;
}

interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
}

interface ProductVariant {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: AdditionalDetails;
  price: number;
  originalPrice: number;
  COD: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
  cartItems?: CartItem[];
  orderItems?: OrderItem[];
  images?: ProductImage[];
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  subCategory?: {
    id: string;
    name: string;
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

interface SubCategoryOption {
  id: string;
  name: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  stock?: string;
  additionalDetails?: string;
  general?: string;
}

const initialFormErrors: FormErrors = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  stock: "",
  additionalDetails: "",
  general: "",
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
const AllProductPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [subCategoryFilterId, setSubCategoryFilterId] = useState<
    string | "all"
  >("all");
  const [codFilter, setCodFilter] = useState<"all" | "true" | "false">("all");
  const [subCategoriesOptions, setSubCategoriesOptions] = useState<
    SubCategoryOption[]
  >([]);

  const [sortKey, setSortKey] = useState<keyof Product | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: 0,
    originalPrice: 0,
    stock: 0,
    COD: false,
    subCategoryId: null as string | null,
    additionalDetails: [] as KeyValuePair[],
  });
  const [createFormImages, setCreateFormImages] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormErrors, setCreateFormErrors] =
    useState<FormErrors>(initialFormErrors);

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    originalPrice: 0,
    stock: 0,
    COD: false,
    subCategoryId: null as string | null,
    additionalDetails: [] as KeyValuePair[],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFormErrors, setUpdateFormErrors] =
    useState<FormErrors>(initialFormErrors);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const token = getAccessToken();
  const router = useRouter();

  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ProductsApiResponse>(
        "/public/product?includeRelations=true"
      );
      const data = response.data.data;
      setAllProducts(data?.products || []);
      setTotalProductsCount(data?.total || 0);
    } catch (err: any) {
      setAllProducts([]);
      toast.error(
        err.response?.data?.message ||
          "Failed to fetch products. Please try again."
      );
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
      toast.error("Failed to load subcategories for product forms.");
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

  const filteredAndPaginatedProducts = useMemo(() => {
    let currentProducts = [...allProducts];

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

    if (subCategoryFilterId !== "all") {
      currentProducts = currentProducts.filter(
        (product) => product.subCategoryId === subCategoryFilterId
      );
    }

    if (codFilter !== "all") {
      const isCOD = codFilter === "true";
      currentProducts = currentProducts.filter(
        (product) => product.COD === isCOD
      );
    }

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
  ]);

  const handleRefresh = () => {
    fetchAllProducts();
    fetchSubCategoriesForForm();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSubCategoryFilterChange = (value: string | "all") => {
    setSubCategoryFilterId(value);
    setCurrentPage(1);
  };

  const handleCodFilterChange = (value: "all" | "true" | "false") => {
    setCodFilter(value);
    setCurrentPage(1);
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
    router.push(`/product/${productId}`);
  };

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setCreateFormImages((prevImages) => [...prevImages, ...newFiles]);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setCreateFormImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const validateForm = (
    form: typeof createForm | typeof updateForm
  ): { errors: FormErrors; isValid: boolean } => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!form.name.trim()) {
      errors.name = "Product Name is required.";
      isValid = false;
    }
    if (!form.description.trim()) {
      errors.description = "Description is required.";
      isValid = false;
    }
    if (Number(form.price) <= 0) {
      errors.price = "Price must be greater than 0.";
      isValid = false;
    }
    if (Number(form.originalPrice) < Number(form.price)) {
      errors.originalPrice =
        "Original price must be greater than or equal to the selling price.";
      isValid = false;
    }
    if (Number(form.stock) < 0 || !Number.isInteger(Number(form.stock))) {
      errors.stock = "Stock must be a non-negative integer.";
      isValid = false;
    }

    const filledDetails = form.additionalDetails.filter(
      (d) => d.key.trim() && d.value.trim()
    );

    if (filledDetails.length === 0) {
      errors.additionalDetails = "At least one additional detail is required.";
      isValid = false;
    } else {
      if (filledDetails.length !== form.additionalDetails.length) {
        errors.additionalDetails =
          "All detail fields must have both a key and a value.";
        isValid = false;
      }
    }

    return { errors, isValid };
  };

  // --- CRUD Handlers ---

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormErrors(initialFormErrors);

    const { errors, isValid } = validateForm(createForm);
    if (!isValid) {
      setCreateFormErrors(errors);
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsCreating(true);

    try {
      let imageIds: string[] = [];

      if (createFormImages.length > 0) {
        toast.info("Uploading product images...");
        const formData = new FormData();
        createFormImages.forEach((imageFile) => {
          formData.append("images", imageFile);
        });

        try {
          const imageResponse = await axiosInstance.post(
            "/admin/image/multiple",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
          if (
            imageResponse.data.status === "success" &&
            imageResponse.data.data.images
          ) {
            imageIds = imageResponse.data.data.images.map(
              (img: { id: string }) => img.id
            );
            toast.success("Images uploaded successfully!");
          } else {
            throw new Error(
              imageResponse.data.message || "Image upload failed silently."
            );
          }
        } catch (imgErr: any) {
          toast.error(
            `Failed to upload images: ${
              imgErr.response?.data?.message || "Please try again later."
            }`
          );
          setIsCreating(false);
          return;
        }
      }

      const additionalDetailsObject: AdditionalDetails = {};
      createForm.additionalDetails.forEach((detail) => {
        if (detail.key.trim() && detail.value.trim()) {
          additionalDetailsObject[detail.key.trim()] = detail.value.trim();
        }
      });

      const payload: { [key: string]: any } = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        price: Number(createForm.price),
        originalPrice: Number(createForm.originalPrice),
        stock: Number(createForm.stock),
        COD: Boolean(createForm.COD),
        additionalDetails: additionalDetailsObject,
      };

      if (imageIds.length > 0) {
        payload.imageIds = imageIds;
      }

      if (
        createForm.subCategoryId !== null &&
        createForm.subCategoryId !== "none"
      ) {
        payload.subCategoryId = createForm.subCategoryId;
      }

      const productResponse = await axiosInstance.post(
        "/admin/product",
        payload
      );

      if (productResponse.data.status === "success") {
        toast.success("Product created successfully!");
        setIsCreateDialogOpen(false);
        fetchAllProducts();
      } else {
        toast.error(
          productResponse.data.message || "Failed to create product."
        );
      }
    } catch (err: any) {
      const apiError = err.response?.data;
      if (apiError && apiError.errors) {
        setCreateFormErrors((prev) => ({ ...prev, ...apiError.errors }));
        toast.error(
          apiError.message || "Server validation failed. Please check the form."
        );
      } else {
        toast.error(
          apiError?.message || "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (product: Product) => {
    const additionalDetailsArray: KeyValuePair[] = product.additionalDetails
      ? Object.entries(product.additionalDetails).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key: key,
          value: String(value),
        }))
      : [];

    setUpdateForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      stock: product.stock,
      COD: product.COD,
      subCategoryId: product.subCategoryId,
      additionalDetails: additionalDetailsArray,
    });
    setUpdateFormErrors(initialFormErrors);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateFormErrors(initialFormErrors);

    const { errors, isValid } = validateForm(updateForm);
    if (!isValid) {
      setUpdateFormErrors(errors);
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsUpdating(true);

    try {
      const additionalDetailsObject: AdditionalDetails = {};
      updateForm.additionalDetails.forEach((detail) => {
        if (detail.key.trim() && detail.value.trim()) {
          additionalDetailsObject[detail.key.trim()] = detail.value.trim();
        }
      });

      const payload: { [key: string]: any } = {
        name: updateForm.name.trim(),
        price: Number(updateForm.price),
        originalPrice: Number(updateForm.originalPrice),
        stock: Number(updateForm.stock),
        COD: Boolean(updateForm.COD),
        description: updateForm.description.trim() || null,
        additionalDetails: additionalDetailsObject,
      };

      if (
        updateForm.subCategoryId !== null &&
        updateForm.subCategoryId !== "none"
      ) {
        payload.subCategoryId = updateForm.subCategoryId;
      } else {
        payload.subCategoryId = null;
      }

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
      const apiError = err.response?.data;
      if (apiError && apiError.errors) {
        setUpdateFormErrors((prev) => ({ ...prev, ...apiError.errors }));
        toast.error(
          apiError.message || "Server validation failed. Please check the form."
        );
      } else {
        toast.error(
          apiError?.message || "An unexpected error occurred. Please try again."
        );
      }
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
      toast.error(
        err.response?.data?.message ||
          "An error occurred during deletion. The product might be in use."
      );
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
              onClick={() => {
                setIsCreateDialogOpen(true);
                setCreateFormErrors(initialFormErrors);
              }}
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
        {/* Stats Cards */}
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
                  maxLength={255}
                />
              </div>
              <div className="w-full sm:w-auto flex flex-wrap gap-4 items-center justify-end">
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
                    <SelectContent>
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
                    <SelectContent>
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
                  className="flex items-center gap-2 flex-shrink-0"
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
                      {[...Array(8)].map((_, i) => (
                        <TableHead key={i}>
                          <Skeleton className="h-4 w-full" />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(10)].map((_, idx) => (
                      <TableRow key={idx}>
                        {[...Array(8)].map((_, i) => (
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
                        onClick={() => handleSort("originalPrice")}
                      >
                        Orignal Price {renderSortIcon("price")}
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
                        <TableCell className="text-foreground">
                          {formatCurrency(product.originalPrice)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.stock === 0 ? "destructive" : "secondary"
                            }
                          >
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                              disabled={loading}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(product)}
                              disabled={loading}
                              className="hover:text-primary hover:bg-primary/10 border-border"
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
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              {isDeleting &&
                              productToDeleteId === product.id ? (
                                <>
                                  <LoadingSpinner className="h-4 w-4 mr-1" />
                                  Deleting...
                                </>
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

      {/* --- Create Product Dialog with Validations --- */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setIsCreating(false);
            setCreateForm({
              name: "",
              description: "",
              price: 0,
              originalPrice: 0,
              stock: 0,
              COD: false,
              subCategoryId: null,
              additionalDetails: [],
            });
            setCreateFormImages([]);
            setCreateFormErrors(initialFormErrors);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="createName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createName"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g., Premium Wireless Headphones"
                  disabled={isCreating}
                  maxLength={255}
                />
                {createFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.name}
                  </p>
                )}
              </div>
              {/* Price */}
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
                      price: e.target.valueAsNumber || 0,
                    })
                  }
                  placeholder="e.g., 2999.99"
                  disabled={isCreating}
                  min="0"
                  step="0.01"
                />
                {createFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.price}
                  </p>
                )}
              </div>
              {/* Original Price */}
              <div>
                <label
                  htmlFor="createOriginalPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Original Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createOriginalPrice"
                  type="number"
                  value={createForm.originalPrice}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      originalPrice: e.target.valueAsNumber || 0,
                    })
                  }
                  placeholder="e.g., 3999.99"
                  disabled={isCreating}
                  min="0"
                  step="0.01"
                />
                {createFormErrors.originalPrice && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.originalPrice}
                  </p>
                )}
              </div>
              {/* Stock */}
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
                      stock: e.target.valueAsNumber || 0,
                    })
                  }
                  placeholder="e.g., 100"
                  disabled={isCreating}
                  min="0"
                />
                {createFormErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.stock}
                  </p>
                )}
              </div>
              {/* Description */}
              <div className="md:col-span-2">
                <label
                  htmlFor="createDescription"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Description <span className="text-destructive">*</span>
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
                  placeholder="Detailed description of the product..."
                  disabled={isCreating}
                  rows={3}
                  maxLength={2000}
                />
                {createFormErrors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {createFormErrors.description}
                  </p>
                )}
              </div>
              {/* SubCategory */}
              <div className="md:col-span-2">
                <label
                  htmlFor="createSubCategory"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  SubCategory
                </label>
                <Select
                  value={createForm.subCategoryId ?? "none"}
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      subCategoryId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isCreating || subCategoriesOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Subcategory</SelectItem>
                    {subCategoriesOptions.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Image Upload */}
              <div className="md:col-span-2">
                <label
                  htmlFor="createImages"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Images (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <label
                      htmlFor="createImages"
                      className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                    >
                      <span>Upload files</span>
                      <Input
                        id="createImages"
                        name="createImages"
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleImageSelect}
                        disabled={isCreating}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP up to 10MB
                    </p>
                  </div>
                </div>
              </div>
              {/* Image Previews */}
              {createFormImages.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Selected Images:
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {createFormImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview ${index}`}
                          className="w-24 h-24 object-cover rounded-md"
                          onLoad={(e) =>
                            URL.revokeObjectURL(
                              (e.target as HTMLImageElement).src
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveImage(index)}
                          disabled={isCreating}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Additional Details */}
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Additional Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {createForm.additionalDetails.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key (e.g., Color)"
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
                        maxLength={100}
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g., Black)"
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
                        maxLength={255}
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
                  {createFormErrors.additionalDetails && (
                    <p className="text-sm text-destructive">
                      {createFormErrors.additionalDetails}
                    </p>
                  )}
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
              {/* COD Checkbox */}
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Creating...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Update Product Dialog with Validations --- */}
      <Dialog
        open={isUpdateDialogOpen}
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) {
            setIsUpdating(false);
            setUpdateForm({
              id: "",
              name: "",
              description: "",
              price: 0,
              originalPrice: 0,
              stock: 0,
              COD: false,
              subCategoryId: null,
              additionalDetails: [],
            });
            setUpdateFormErrors(initialFormErrors);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="updateName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateName"
                  value={updateForm.name}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, name: e.target.value })
                  }
                  disabled={isUpdating}
                  maxLength={255}
                />
                {updateFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.name}
                  </p>
                )}
              </div>
              {/* Price */}
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
                      price: e.target.valueAsNumber || 0,
                    })
                  }
                  disabled={isUpdating}
                  min="0"
                  step="0.01"
                />
                {updateFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.price}
                  </p>
                )}
              </div>
              {/* Original Price */}
              <div>
                <label
                  htmlFor="updateOriginalPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Original Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateOriginalPrice"
                  type="number"
                  value={updateForm.originalPrice}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      originalPrice: e.target.valueAsNumber || 0,
                    })
                  }
                  disabled={isUpdating}
                  min="0"
                  step="0.01"
                />
                {updateFormErrors.originalPrice && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.originalPrice}
                  </p>
                )}
              </div>
              {/* Stock */}
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
                      stock: e.target.valueAsNumber || 0,
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
              {/* Description */}
              <div className="md:col-span-2">
                <label
                  htmlFor="updateDescription"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Description <span className="text-destructive">*</span>
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
                  disabled={isUpdating}
                  rows={3}
                  maxLength={2000}
                />
                {updateFormErrors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.description}
                  </p>
                )}
              </div>
              {/* SubCategory */}
              <div className="md:col-span-2">
                <label
                  htmlFor="updateSubCategory"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  SubCategory
                </label>
                <Select
                  value={updateForm.subCategoryId ?? "none"}
                  onValueChange={(value) =>
                    setUpdateForm({
                      ...updateForm,
                      subCategoryId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isUpdating || subCategoriesOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Subcategory</SelectItem>
                    {subCategoriesOptions.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Additional Details */}
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Additional Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {updateForm.additionalDetails.map((detail) => (
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
                        maxLength={100}
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
                        maxLength={255}
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
                  {updateFormErrors.additionalDetails && (
                    <p className="text-sm text-destructive">
                      {updateFormErrors.additionalDetails}
                    </p>
                  )}
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
              {/* COD Checkbox */}
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </>
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
          if (!open) setIsDeleting(false);
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-1" />
                    Deleting...
                  </>
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
