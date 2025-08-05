"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ImageIcon, // Main icon for images
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye, // For 'View Image Details'
  Info, // For error/empty state - KEPT FOR "NO IMAGES FOUND" SCENARIO
  Plus, // For Add Image
  Edit, // For Edit Image
  Trash2, // For Delete Image
  CheckCircle, // For true boolean status
  XCircle, // For false boolean status
  HardDrive, // For associations
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
  SelectGroup, // Added for better structure with search
  SelectLabel, // Added for better structure with search
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Added motion import

// --- Type Definitions ---
interface Image {
  id: string;
  isHeroImage: boolean;
  isLogo: boolean;
  isIcon: boolean;
  productId: string | null;
  categoryId: string | null;
  subCategoryId: string | null;
  blogId: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface ImagesData {
  images: Image[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ImagesApiResponse extends ApiResponse {
  data: ImagesData;
}

// For filter/form dropdown options (simplified, in real app these would be fetched from respective APIs)
interface EntityOption {
  id: string;
  name: string; // Or some displayable property
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

const AllImagesPage = () => {
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalImagesCount, setTotalImagesCount] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [associationFilter, setAssociationFilter] = useState<
    "all" | "productId" | "categoryId" | "subCategoryId" | "blogId" | "none"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "isHeroImage" | "isLogo" | "isIcon"
  >("all");

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Image | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // CRUD operation states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    image: File | null;
    productId: string | null;
    categoryId: string | null;
    subCategoryId: string | null;
    blogId: string | null;
    isHeroImage: boolean;
    isLogo: boolean;
    isIcon: boolean;
  }>({
    image: null,
    productId: null,
    categoryId: null,
    subCategoryId: null,
    blogId: null,
    isHeroImage: false,
    isLogo: false,
    isIcon: false,
  });
  const [selectedCreateAssociationType, setSelectedCreateAssociationType] =
    useState<"none" | "productId" | "categoryId" | "subCategoryId" | "blogId">(
      "none"
    );
  const [isCreating, setIsCreating] = useState(false);

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState<{
    id: string;
    productId: string | null;
    categoryId: string | null;
    subCategoryId: string | null;
    blogId: string | null;
    isHeroImage: boolean;
    isLogo: boolean;
    isIcon: boolean;
  }>({
    id: "",
    productId: null,
    categoryId: null,
    subCategoryId: null,
    blogId: null,
    isHeroImage: false,
    isLogo: false,
    isIcon: false,
  });
  const [selectedUpdateAssociationType, setSelectedUpdateAssociationType] =
    useState<"none" | "productId" | "categoryId" | "subCategoryId" | "blogId">(
      "none"
    );
  const [isUpdating, setIsUpdating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Options for association dropdowns (replace with actual fetches for products, categories etc.)
  const [productOptions, setProductOptions] = useState<EntityOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<EntityOption[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<EntityOption[]>(
    []
  );
  const [blogOptions, setBlogOptions] = useState<EntityOption[]>([]); // You'd fetch actual blog posts here

  // New state for search query within dialog select dropdowns
  const [filterOptionsSearchQuery, setFilterOptionsSearchQuery] = useState("");

  const router = useRouter();
  const token = getAccessToken(); // Ensure token is available for admin APIs

  // --- Data Fetching ---
  const fetchAllImages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ImagesApiResponse>(
        "/public/image"
      );
      const data = response.data.data;
      setAllImages(data?.images || []);
      setTotalImagesCount(data?.total || 0);
      // Removed setError(null);
    } catch (err: any) {
      setAllImages([]);
      toast.error(err.message || "Failed to fetch images. Please try again."); // Display toast error
      console.error("Fetch images error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEntityOptions = useCallback(async () => {
    // In a real app, you'd fetch these from their respective API endpoints
    // For now, mocking them or fetching a small subset
    try {
      const productRes = await axiosInstance.get<
        ApiResponse<{ products: { id: string; name: string }[] }>
      >("/public/product");
      setProductOptions(productRes.data.data?.products || []);
      const categoryRes = await axiosInstance.get<
        ApiResponse<{ categories: { id: string; name: string }[] }>
      >("/public/category");
      setCategoryOptions(categoryRes.data.data?.categories || []);
      const subCategoryRes = await axiosInstance.get<
        ApiResponse<{ subCategories: { id: string; name: string }[] }>
      >("/public/sub-category");
      setSubCategoryOptions(subCategoryRes.data.data?.subCategories || []);
      // Mocking blog options for demonstration since you don't have a direct API
      setBlogOptions([
        { id: "blog-1", name: "First Blog Post" },
        { id: "blog-2", name: "Another Blog Entry" },
      ]);
    } catch (error) {
      console.error("Failed to fetch entity options:", error);
      toast.error("Failed to load options for filters/forms.");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllImages();
    fetchEntityOptions();
  }, [token, router, fetchAllImages, fetchEntityOptions]);

  // --- Filtering & Sorting Logic ---
  const filteredAndPaginatedImages = useMemo(() => {
    let currentImages = [...allImages];

    // 1. Apply Search Filter (on image ID or URL)
    // NOTE: If you don't display ID/URL, searching by them might be less intuitive for users.
    // Consider adding search by associated entity name here if that's more useful.
    if (searchQuery) {
      currentImages = currentImages.filter(
        (image) =>
          image.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          image.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          // Potentially add searching by associated entity name here
          (image.productId &&
            productOptions
              .find((p) => p.id === image.productId)
              ?.name.toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (image.categoryId &&
            categoryOptions
              .find((c) => c.id === image.categoryId)
              ?.name.toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (image.subCategoryId &&
            subCategoryOptions
              .find((sc) => sc.id === image.subCategoryId)
              ?.name.toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (image.blogId &&
            blogOptions
              .find((b) => b.id === image.blogId)
              ?.name.toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // 2. Apply Association Filter
    if (associationFilter !== "all") {
      currentImages = currentImages.filter((image) => {
        if (associationFilter === "none") {
          return (
            !image.productId &&
            !image.categoryId &&
            !image.subCategoryId &&
            !image.blogId
          );
        }
        return image[associationFilter] !== null;
      });
    }

    // 3. Apply Type Filter
    if (typeFilter !== "all") {
      currentImages = currentImages.filter((image) => {
        if (typeFilter === "isHeroImage") return image.isHeroImage;
        if (typeFilter === "isLogo") return image.isLogo;
        if (typeFilter === "isIcon") return image.isIcon;
        return false; // Should not reach here
      });
    }

    // 4. Apply Sorting
    if (sortKey) {
      currentImages.sort((a, b) => {
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
        // Handle boolean sorting for isHeroImage, isLogo, isIcon
        if (typeof aValue === "boolean" && typeof bValue === "boolean") {
          return sortDirection === "asc"
            ? aValue === bValue
              ? 0
              : aValue
              ? 1
              : -1
            : aValue === bValue
            ? 0
            : aValue
            ? -1
            : 1;
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
    const imagesPerPage = 10;
    const newTotalPages = Math.ceil(currentImages.length / imagesPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;

    return currentImages.slice(startIndex, endIndex);
  }, [
    allImages,
    searchQuery,
    associationFilter,
    typeFilter,
    sortKey,
    sortDirection,
    currentPage,
    productOptions, // Added for search functionality
    categoryOptions, // Added for search functionality
    subCategoryOptions, // Added for search functionality
    blogOptions, // Added for search functionality
  ]);

  // --- Handlers ---
  const handleRefresh = () => {
    fetchAllImages();
    fetchEntityOptions();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset pagination on search
  };

  const handleAssociationFilterChange = (value: typeof associationFilter) => {
    setAssociationFilter(value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (value: typeof typeFilter) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Image) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Image) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleViewDetails = (imageId: string) => {
    router.push(`/image/${imageId}`); // Navigate to image details page
  };

  // --- CRUD Handlers ---

  const handleCreateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    // Removed setError(null);

    if (!createForm.image) {
      toast.error("Image file is required.");
      setIsCreating(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", createForm.image as File);

    // Append the boolean flags, converting them to strings, only if true
    if (createForm.isHeroImage) formData.append("isHeroImage", "true");
    if (createForm.isLogo) formData.append("isLogo", "true");
    if (createForm.isIcon) formData.append("isIcon", "true");

    // Append the selected association ID
    if (selectedCreateAssociationType !== "none") {
      const idKey = selectedCreateAssociationType;
      const idValue = createForm[idKey as keyof typeof createForm]; // Keep this as is
      if (idValue) {
        formData.append(idKey, idValue as string); // Explicitly cast idValue to string
      } else {
        toast.error(
          `Please select an ID for the chosen association type: ${idKey}.`
        );
        setIsCreating(false);
        return;
      }
    }

    try {
      const response = await axiosInstance.post("/admin/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        toast.success("Image uploaded successfully!");
        setIsCreateDialogOpen(false);
        setCreateForm({
          image: null,
          productId: null,
          categoryId: null,
          subCategoryId: null,
          blogId: null,
          isHeroImage: false, // Reset on close
          isLogo: false,
          isIcon: false,
        });
        setSelectedCreateAssociationType("none");
        setFilterOptionsSearchQuery(""); // Clear search filter in dialog
        fetchAllImages(); // Refresh list
        fetchEntityOptions(); // Refresh entity options as well
      } else {
        toast.error(response.data.message || "Failed to upload image.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during upload.");
      if (err.response && err.response.status === 413) {
        toast.error(
          "Image too large. Please upload an image smaller than 5MB."
        );
      } else {
        toast.error(err.response?.data?.message || "Error uploading image.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (image: Image) => {
    // Determine the current association type for the update form
    let currentAssociationType: typeof selectedUpdateAssociationType = "none";
    if (image.productId) currentAssociationType = "productId";
    else if (image.categoryId) currentAssociationType = "categoryId";
    else if (image.subCategoryId) currentAssociationType = "subCategoryId";
    else if (image.blogId) currentAssociationType = "blogId";

    setUpdateForm({
      id: image.id,
      productId: image.productId,
      categoryId: image.categoryId,
      subCategoryId: image.subCategoryId,
      blogId: image.blogId,
      isHeroImage: image.isHeroImage, // Keep current value
      isLogo: image.isLogo, // Keep current value
      isIcon: image.isIcon, // Keep current value
    });
    setSelectedUpdateAssociationType(currentAssociationType);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    // Removed setError(null);

    // Build payload, ensuring only one association ID is present based on selected type
    const payload: { [key: string]: any } = {};

    // Only include type flags if they are explicitly true in the form
    if (updateForm.isHeroImage) payload.isHeroImage = true;
    if (updateForm.isLogo) payload.isLogo = true;
    if (updateForm.isIcon) payload.isIcon = true;

    // Handle association ID based on selected type, UNLESS a boolean flag is true
    if (!updateForm.isHeroImage && !updateForm.isLogo && !updateForm.isIcon) {
      if (selectedUpdateAssociationType !== "none") {
        const idKey = selectedUpdateAssociationType;
        const idValue = updateForm[idKey as keyof typeof updateForm];
        if (idValue) {
          payload[idKey] = idValue;
        } else {
          // This case means a type was selected but no ID was chosen, which is an error per API.
          toast.error(
            `Please select an ID for the chosen association type: ${idKey}.`
          );
          setIsUpdating(false);
          return;
        }
      } else {
        // If "none" is selected and no boolean flag is true, ensure all association IDs are explicitly set to null
        payload.productId = null;
        payload.categoryId = null;
        payload.subCategoryId = null;
        payload.blogId = null;
      }
    }

    try {
      const response = await axiosInstance.patch(
        `/admin/image/${updateForm.id}`,
        payload
      );

      if (response.data.status === "success") {
        toast.success("Image updated successfully!");
        setIsUpdateDialogOpen(false);
        // Reset flags to null after successful update to ensure they don't override next update
        setUpdateForm((prev) => ({
          ...prev,
          isHeroImage: false,
          isLogo: false,
          isIcon: false,
        }));
        setFilterOptionsSearchQuery(""); // Clear search filter in dialog
        fetchAllImages(); // Refresh list
        fetchEntityOptions(); // Refresh entity options as well
      } else {
        toast.error(response.data.message || "Failed to update image.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during update.");
      toast.error(err.response?.data?.message || "Error updating image.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteImageClick = (imageId: string) => {
    setImageToDeleteId(imageId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteImage = async () => {
    if (!imageToDeleteId) return;

    setIsDeleting(true);
    // Removed setError(null);
    try {
      const response = await axiosInstance.delete(
        `/admin/image/${imageToDeleteId}`
      );
      if (response.data.status === "success") {
        toast.success("Image deleted successfully!");
        setIsDeleteDialogOpen(false);
        setImageToDeleteId(null);
        fetchAllImages(); // Refresh list
      } else {
        toast.error(response.data.message || "Failed to delete image.");
      }
    } catch (err: any) {
      // Removed setError(err.message || "An unexpected error occurred during deletion.");
      toast.error(err.response?.data?.message || "Error deleting image.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to filter options for select dropdowns
  const getFilteredOptions = (options: EntityOption[]) => {
    if (!filterOptionsSearchQuery) {
      return options;
    }
    const lowerCaseQuery = filterOptionsSearchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(lowerCaseQuery) ||
        option.id.toLowerCase().includes(lowerCaseQuery) // Still search by ID, but don't show it
    );
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
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Image Management
                </h1>
                <span className="text-muted-foreground">
                  Manage all images in your store
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="hover:bg-primary"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Image
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
                    Total Images
                  </CardTitle>
                  <ImageIcon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalImagesCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Hero Images
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {allImages.filter((img) => img.isHeroImage).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Logos
                  </CardTitle>
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {allImages.filter((img) => img.isLogo).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Icons
                  </CardTitle>
                  <ImageIcon className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {allImages.filter((img) => img.isIcon).length}
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
                  placeholder="Search images by ID or URL..." // Note: Internal search logic will still use ID/URL
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2"
                  aria-label="Search images"
                  disabled={loading}
                  maxLength={255} // Max length for search query (common for URLs or IDs)
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Association Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={associationFilter}
                    onValueChange={handleAssociationFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[180px] pl-10">
                      <SelectValue placeholder="Filter by Association" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem value="all">All Associations</SelectItem>
                      <SelectItem value="productId">Product</SelectItem>
                      <SelectItem value="categoryId">Category</SelectItem>
                      <SelectItem value="subCategoryId">Subcategory</SelectItem>
                      <SelectItem value="blogId">Blog</SelectItem>
                      <SelectItem value="none">No Association</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={typeFilter}
                    onValueChange={handleTypeFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[150px] pl-10">
                      <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="isHeroImage">Hero Image</SelectItem>
                      <SelectItem value="isLogo">Logo</SelectItem>
                      <SelectItem value="isIcon">Icon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-primary"
                  aria-label="Refresh image list"
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

        {/* Images Table */}
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
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-48" />
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
                          <Skeleton className="h-16 w-16 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : filteredAndPaginatedImages.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No images found
                  </h3>
                  <span className="text-muted-foreground mb-4">
                    Adjust your search or filters, or upload a new image.
                  </span>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="hover:bg-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Image
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
                      <TableHead>Preview</TableHead>
                      {/* Removed ID TableHead */}
                      {/* Removed URL TableHead */}
                      <TableHead>Associated With</TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Uploaded At {renderSortIcon("createdAt")}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndPaginatedImages.map((image) => (
                      <TableRow key={image.id}>
                        <TableCell>
                          <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                            {image.url ? (
                              <img
                                src={image.url}
                                alt="Image preview"
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {image.isHeroImage && (
                            <Badge variant="secondary" className="mr-1">
                              Hero
                            </Badge>
                          )}
                          {image.isIcon && (
                            <Badge variant="secondary" className="mr-1">
                              Icon
                            </Badge>
                          )}
                          {image.isLogo && (
                            <Badge variant="secondary" className="mr-1">
                              Logo
                            </Badge>
                          )}
                          {image.productId && (
                            <Badge variant="secondary" className="mr-1">
                              Product
                            </Badge>
                          )}
                          {image.categoryId && (
                            <Badge variant="secondary" className="mr-1">
                              Category
                            </Badge>
                          )}
                          {image.subCategoryId && (
                            <Badge variant="secondary" className="mr-1">
                              SubCategory
                            </Badge>
                          )}
                          {image.blogId && (
                            <Badge variant="secondary" className="mr-1">
                              Blog
                            </Badge>
                          )}
                          {!image.productId &&
                            !image.categoryId &&
                            !image.subCategoryId &&
                            !image.blogId &&
                            !image.isHeroImage &&
                            !image.isLogo &&
                            !image.isIcon && (
                              <Badge variant="outline">None</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center space-x-1">
                            <span>{formatDate(image.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(image.id)}
                              className="hover:bg-primary"
                              disabled={loading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(image)}
                              className="hover:bg-primary"
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteImageClick(image.id)}
                              disabled={isDeleting || loading}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              {isDeleting && imageToDeleteId === image.id ? (
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
        {filteredAndPaginatedImages.length > 0 && (
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
              className="hover:bg-primary"
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
              className="hover:bg-primary"
            >
              Next
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Image Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setIsCreating(false);
            setCreateForm({
              image: null,
              productId: null,
              categoryId: null,
              subCategoryId: null,
              blogId: null,
              isHeroImage: false, // Reset on close
              isLogo: false,
              isIcon: false,
            });
            setSelectedCreateAssociationType("none");
            setFilterOptionsSearchQuery(""); // Clear search filter when dialog closes
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateImage} className="space-y-4">
            <div>
              <label
                htmlFor="imageFile"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Image File <span className="text-destructive">*</span>
              </label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    image: e.target.files ? e.target.files[0] : null,
                  })
                }
                disabled={isCreating || loading}
                required
                maxLength={255} // Max length for file name (often restricted by OS)
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createIsHeroImage"
                  checked={createForm.isHeroImage}
                  onCheckedChange={(checked: boolean) =>
                    setCreateForm({
                      ...createForm,
                      isHeroImage: checked,
                      isLogo: checked ? false : createForm.isLogo, // Uncheck others if this is checked
                      isIcon: checked ? false : createForm.isIcon, // Uncheck others if this is checked
                    })
                  }
                  disabled={isCreating || loading}
                />
                <label
                  htmlFor="createIsHeroImage"
                  className="text-sm font-medium"
                >
                  Is Hero
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createIsLogo"
                  checked={createForm.isLogo}
                  onCheckedChange={(checked: boolean) =>
                    setCreateForm({
                      ...createForm,
                      isLogo: checked,
                      isHeroImage: checked ? false : createForm.isHeroImage, // Uncheck others if this is checked
                      isIcon: checked ? false : createForm.isIcon, // Uncheck others if this is checked
                    })
                  }
                  disabled={isCreating || loading}
                />
                <label htmlFor="createIsLogo" className="text-sm font-medium">
                  Is Logo
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createIsIcon"
                  checked={createForm.isIcon}
                  onCheckedChange={(checked: boolean) =>
                    setCreateForm({
                      ...createForm,
                      isIcon: checked,
                      isHeroImage: checked ? false : createForm.isHeroImage, // Uncheck others if this is checked
                      isLogo: checked ? false : createForm.isLogo, // Uncheck others if this is checked
                    })
                  }
                  disabled={isCreating || loading}
                />
                <label htmlFor="createIsIcon" className="text-sm font-medium">
                  Is Icon
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="createAssociationType"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Associate With
              </label>
              <Select
                value={selectedCreateAssociationType}
                onValueChange={(
                  value: typeof selectedCreateAssociationType
                ) => {
                  setSelectedCreateAssociationType(value);
                  setCreateForm({
                    ...createForm,
                    productId: null,
                    categoryId: null,
                    subCategoryId: null,
                    blogId: null,
                  }); // Clear other IDs
                  setFilterOptionsSearchQuery(""); // Clear search filter when dialog closes
                }}
                disabled={
                  isCreating ||
                  createForm.isHeroImage ||
                  createForm.isLogo ||
                  createForm.isIcon ||
                  loading
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select association type" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg bg-popover">
                  <SelectItem value="none">No Association</SelectItem>
                  <SelectItem value="productId">Product</SelectItem>
                  <SelectItem value="categoryId">Category</SelectItem>
                  <SelectItem value="subCategoryId">Subcategory</SelectItem>
                  <SelectItem value="blogId">Blog Post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedCreateAssociationType === "productId" && (
              <div>
                <label
                  htmlFor="createProductId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product
                </label>
                <Select
                  value={createForm.productId ?? "none"} // Use 'none' for placeholder/null
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      productId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isCreating || productOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search products..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Product</SelectItem>{" "}
                    {/* Explicit "No selection" */}
                    {getFilteredOptions(productOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching products
                      </SelectItem>
                    ) : (
                      getFilteredOptions(productOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} {/* Only show name */}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedCreateAssociationType === "categoryId" && (
              <div>
                <label
                  htmlFor="createCategoryId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Category
                </label>
                <Select
                  value={createForm.categoryId ?? "none"}
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      categoryId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isCreating || categoryOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search categories..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Category</SelectItem>
                    {getFilteredOptions(categoryOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching categories
                      </SelectItem>
                    ) : (
                      getFilteredOptions(categoryOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} {/* Only show name */}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedCreateAssociationType === "subCategoryId" && (
              <div>
                <label
                  htmlFor="createSubCategoryId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Subcategory
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
                    isCreating || subCategoryOptions.length === 0 || loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search subcategories..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Subcategory</SelectItem>
                    {getFilteredOptions(subCategoryOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching subcategories
                      </SelectItem>
                    ) : (
                      getFilteredOptions(subCategoryOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} {/* Only show name */}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedCreateAssociationType === "blogId" && (
              <div>
                <label
                  htmlFor="createBlogId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Blog Post
                </label>
                <Select
                  value={createForm.blogId ?? "none"}
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      blogId: value === "none" ? null : value,
                    })
                  }
                  disabled={isCreating || blogOptions.length === 0 || loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a blog post" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search blog posts..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Blog Post</SelectItem>
                    {getFilteredOptions(blogOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching blog posts
                      </SelectItem>
                    ) : (
                      getFilteredOptions(blogOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} {/* Only show name */}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="hover:bg-primary"
              >
                {isCreating ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Uploading...
                  </div>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Image Dialog */}
      <Dialog
        open={isUpdateDialogOpen}
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) {
            setIsUpdating(false);
            setUpdateForm({
              id: "",
              productId: null,
              categoryId: null,
              subCategoryId: null,
              blogId: null,
              isHeroImage: false, // Reset to false on close
              isLogo: false,
              isIcon: false,
            });
            setSelectedUpdateAssociationType("none");
            setFilterOptionsSearchQuery(""); // Clear search filter when dialog closes
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateImage} className="space-y-4">
            <div>
              <p className="block text-sm font-medium text-muted-foreground mb-1">
                Image ID:{" "}
                <span className="text-foreground font-semibold">
                  {updateForm.id}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isHeroImage"
                  checked={updateForm.isHeroImage}
                  onCheckedChange={(checked: boolean) =>
                    setUpdateForm({
                      ...updateForm,
                      isHeroImage: checked,
                      isLogo: checked ? false : updateForm.isLogo, // Uncheck others if this is checked
                      isIcon: checked ? false : updateForm.isIcon, // Uncheck others if this is checked
                    })
                  }
                  disabled={isUpdating || loading}
                />
                <label htmlFor="isHeroImage" className="text-sm font-medium">
                  Is Hero Image
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isLogo"
                  checked={updateForm.isLogo}
                  onCheckedChange={(checked: boolean) =>
                    setUpdateForm({
                      ...updateForm,
                      isLogo: checked,
                      isHeroImage: checked ? false : updateForm.isHeroImage, // Uncheck others if this is checked
                      isIcon: checked ? false : updateForm.isIcon, // Uncheck others if this is checked
                    })
                  }
                  disabled={isUpdating || loading}
                />
                <label htmlFor="isLogo" className="text-sm font-medium">
                  Is Logo
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isIcon"
                  checked={updateForm.isIcon}
                  onCheckedChange={(checked: boolean) =>
                    setUpdateForm({
                      ...updateForm,
                      isIcon: checked,
                      isHeroImage: checked ? false : updateForm.isHeroImage, // Uncheck others if this is checked
                      isLogo: checked ? false : updateForm.isLogo, // Uncheck others if this is checked
                    })
                  }
                  disabled={isUpdating || loading}
                />
                <label htmlFor="isIcon" className="text-sm font-medium">
                  Is Icon
                </label>
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <label
                htmlFor="updateAssociationType"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Change Association (Select one or 'None' to clear)
              </label>
              <Select
                value={selectedUpdateAssociationType}
                onValueChange={(
                  value: typeof selectedUpdateAssociationType
                ) => {
                  setSelectedUpdateAssociationType(value);
                  setUpdateForm((prev) => ({
                    ...prev,
                    productId: null,
                    categoryId: null,
                    subCategoryId: null,
                    blogId: null,
                  })); // Clear other IDs
                  setFilterOptionsSearchQuery(""); // Clear search filter when association type changes
                }}
                disabled={
                  isUpdating ||
                  updateForm.isHeroImage ||
                  updateForm.isLogo ||
                  updateForm.isIcon ||
                  loading
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select association type" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg bg-popover">
                  <SelectItem value="none">No Association</SelectItem>
                  <SelectItem value="productId">Product</SelectItem>
                  <SelectItem value="categoryId">Category</SelectItem>
                  <SelectItem value="subCategoryId">Subcategory</SelectItem>
                  <SelectItem value="blogId">Blog Post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedUpdateAssociationType === "productId" && (
              <div>
                <label
                  htmlFor="updateProductId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product
                </label>
                <Select
                  value={updateForm.productId ?? "none"}
                  onValueChange={(value) =>
                    setUpdateForm({
                      ...updateForm,
                      productId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isUpdating ||
                    productOptions.length === 0 ||
                    updateForm.isHeroImage ||
                    updateForm.isLogo ||
                    updateForm.isIcon ||
                    loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search products..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Product</SelectItem>
                    {getFilteredOptions(productOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching products
                      </SelectItem>
                    ) : (
                      getFilteredOptions(productOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedUpdateAssociationType === "categoryId" && (
              <div>
                <label
                  htmlFor="updateCategoryId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Category
                </label>
                <Select
                  value={updateForm.categoryId ?? "none"}
                  onValueChange={(value) =>
                    setUpdateForm({
                      ...updateForm,
                      categoryId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isUpdating ||
                    categoryOptions.length === 0 ||
                    updateForm.isHeroImage ||
                    updateForm.isLogo ||
                    updateForm.isIcon ||
                    loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search categories..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Category</SelectItem>
                    {getFilteredOptions(categoryOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching categories
                      </SelectItem>
                    ) : (
                      getFilteredOptions(categoryOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedUpdateAssociationType === "subCategoryId" && (
              <div>
                <label
                  htmlFor="updateSubCategoryId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Subcategory
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
                    isUpdating ||
                    subCategoryOptions.length === 0 ||
                    updateForm.isHeroImage ||
                    updateForm.isLogo ||
                    updateForm.isIcon ||
                    loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search subcategories..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Subcategory</SelectItem>
                    {getFilteredOptions(subCategoryOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching subcategories
                      </SelectItem>
                    ) : (
                      getFilteredOptions(subCategoryOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedUpdateAssociationType === "blogId" && (
              <div>
                <label
                  htmlFor="updateBlogId"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Blog Post
                </label>
                <Select
                  value={updateForm.blogId ?? "none"}
                  onValueChange={(value) =>
                    setUpdateForm({
                      ...updateForm,
                      blogId: value === "none" ? null : value,
                    })
                  }
                  disabled={
                    isUpdating ||
                    blogOptions.length === 0 ||
                    updateForm.isHeroImage ||
                    updateForm.isLogo ||
                    updateForm.isIcon ||
                    loading
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a blog post" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg bg-popover">
                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                      <Input
                        placeholder="Search blog posts..."
                        value={filterOptionsSearchQuery}
                        onChange={(e) =>
                          setFilterOptionsSearchQuery(e.target.value)
                        }
                        className="w-full h-8"
                        maxLength={100} // Max length for search input in select
                      />
                    </div>
                    <SelectItem value="none">No Blog Post</SelectItem>
                    {getFilteredOptions(blogOptions).length === 0 ? (
                      <SelectItem value="no-match" disabled>
                        No matching blog posts
                      </SelectItem>
                    ) : (
                      getFilteredOptions(blogOptions).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={isUpdating}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="hover:bg-primary"
              >
                {isUpdating ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </div>
                ) : (
                  "Update Image"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Image Dialog */}
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
              Are you sure you want to delete this image? This action cannot be
              undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteImage}
                disabled={isDeleting}
                className="hover:bg-destructive/80"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Image
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

export default AllImagesPage;
