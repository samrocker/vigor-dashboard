"use client";
import { axiosInstance } from "@/lib/axios";
import { SubCategoriesApiResponse, SubCategory } from "@/types/schemas";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion"; // Added motion import
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Badge,
  Calendar,
  Edit,
  FolderOpen,
  Plus,
  Trash2,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Info,
  Eye, // Import the Eye icon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoriesApiResponse, Category } from "@/types/schemas";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AllSubCategoryPage = () => {
  const [allSubCategories, setAllSubCategories] = useState<SubCategory[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  // Removed error state: const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    categoryId: "",
  });
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subCategoryToDeleteId, setSubCategoryToDeleteId] = useState<
    string | null
  >(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState<string | "all">(
    "all"
  );
  const [sortKey, setSortKey] = useState<keyof SubCategory | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    fetchSubCategoriesData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get<CategoriesApiResponse>(
        "/public/category"
      );
      if (response.data.status === "success" && response.data.data) {
        setCategories(response.data.data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      toast.error("Failed to load categories for selection.");
    }
  };

  const fetchSubCategoriesData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<SubCategoriesApiResponse>(
        "/public/sub-category"
      );
      if (response.data.status === "success" && response.data.data) {
        setAllSubCategories(response.data.data?.subCategories || []);
        setTotal(response.data.data?.total || 0);
        // Removed setError(null);
      } else {
        toast.error(response.data.message || "Failed to fetch subcategories"); // Show toast on error
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while fetching subcategories."); // Show toast on unexpected error
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSubCategories = useMemo(() => {
    let currentSubCategories = allSubCategories;

    if (searchQuery) {
      currentSubCategories = currentSubCategories.filter(
        (subCategory) =>
          subCategory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (subCategory.description &&
            subCategory.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    if (categoryFilterId !== "all") {
      currentSubCategories = currentSubCategories.filter(
        (subCategory) => subCategory.categoryId === categoryFilterId
      );
    }

    if (sortKey) {
      currentSubCategories = [...currentSubCategories].sort((a, b) => {
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
        if (sortKey === "createdAt" || sortKey === "updatedAt") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }

    return currentSubCategories;
  }, [allSubCategories, searchQuery, categoryFilterId, sortKey, sortDirection]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!createForm.categoryId.trim()) {
      toast.error("Category is required");
      return;
    }
    setIsCreating(true);
    try {
      const response = await axiosInstance.post("/admin/sub-category", {
        name: createForm.name,
        description: createForm.description,
        categoryId: createForm.categoryId,
      });
      if (response.data.status === "success" && response.data.data) {
        setCreateForm({ name: "", description: "", categoryId: "" });
        toast.success("SubCategory created successfully");
        setIsCreateDialogOpen(false);
        fetchSubCategoriesData();
      } else {
        toast.error(response.data.message || "Failed to create subcategory");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while creating subcategory.");
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (subCategory: SubCategory) => {
    setUpdateForm({
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description || "",
    });
    setIsUpdateDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axiosInstance.patch(
        `/admin/sub-category/${updateForm.id}`,
        {
          name: updateForm.name,
          description: updateForm.description,
        }
      );
      if (response.data.status === "success") {
        setAllSubCategories(
          allSubCategories.map((subCat) =>
            subCat.id === updateForm.id
              ? {
                  ...subCat,
                  name: updateForm.name,
                  description: updateForm.description,
                }
              : subCat
          )
        );
        setIsUpdateDialogOpen(false);
        toast.success("SubCategory updated successfully");
      } else {
        toast.error(response.data.message || "Failed to update subcategory");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while updating subcategory.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (id: string) => {
    setSubCategoryToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subCategoryToDeleteId) return;

    setIsDeleting(subCategoryToDeleteId);
    try {
      const response = await axiosInstance.delete(
        `/admin/sub-category/${subCategoryToDeleteId}`
      );
      if (response.data.status === "success") {
        setAllSubCategories(
          allSubCategories.filter(
            (subCat) => subCat.id !== subCategoryToDeleteId
          )
        );
        setTotal(total - 1);
        toast.success("SubCategory deleted successfully");
      } else {
        toast.error(response.data.message || "Failed to delete subcategory");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while deleting subcategory.");
    } finally {
      setIsDeleting(null);
      setIsDeleteDialogOpen(false);
      setSubCategoryToDeleteId(null);
    }
  };

  const handleSort = (key: keyof SubCategory) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof SubCategory) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // New function to handle navigation to details page
  const handleViewDetails = (subCategoryId: string) => {
    router.push(`/subcategory/${subCategoryId}`); // Assuming your subcategory details page is at /subcategories/[id]
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4"
      >
        {/* Header Section Skeleton */}
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

        {/* Main Content Area Skeletons */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          </div>

          {/* Controls: Search and Filters Skeleton */}
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-auto flex-1">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Skeleton className="h-10 w-[180px]" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </Card>

          {/* SubCategories Table Skeleton */}
          <Card className="border-border shadow-sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-48" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
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
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
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
        </div>
      </motion.div>
    );
  }

  // Removed the entire `if (error)` block, as errors are now handled by toasts.

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    SubCategories
                  </h1>
                  <span className="text-muted-foreground">
                    Manage your content subcategories
                  </span>
                </div>
              </div>
              {/* Dialog for creating a new subcategory - remains here */}
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add SubCategory
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New SubCategory</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label
                        htmlFor="createName"
                        className="block text-sm font-medium text-foreground mb-1"
                      >
                        Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="createName"
                        type="text"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter subcategory name"
                        disabled={isCreating}
                        required
                        maxLength={100} // Set max length for subcategory name
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="createDescription"
                        className="block text-sm font-medium text-foreground mb-1"
                      >
                        Description
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
                        placeholder="Enter subcategory description"
                        disabled={isCreating}
                        rows={3}
                        maxLength={500} // Set max length for subcategory description
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="createCategoryId"
                        className="block text-sm font-medium text-foreground mb-1"
                      >
                        Category <span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={createForm.categoryId}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, categoryId: value })
                        }
                        disabled={
                          isCreating || categories.length === 0 || loading
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>

                        <SelectContent className="rounded-lg shadow-lg bg-popover">
                          {categories.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No categories available
                            </SelectItem>
                          ) : (
                            categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id}
                                className={`
                                 rounded-md text-sm font-medium my-1
                                 focus:bg-opacity-80 focus:text-opacity-90
                                 transition-all duration-150
                                `}
                              >
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                            Creating...
                          </div>
                        ) : (
                          "Create SubCategory"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Subcategories
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{total}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {filteredAndSortedSubCategories.length} currently displayed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls: Search and Filters - remains the same */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-auto flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search subcategories by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2"
                  aria-label="Search subcategories"
                  disabled={loading}
                  maxLength={100} // Set max length for search query
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Select
                    value={categoryFilterId}
                    onValueChange={(value) => setCategoryFilterId(value)}
                    disabled={loading || categories.length === 0}
                  >
                    <SelectTrigger className="w-[180px] pl-10">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>

                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem
                        value="all"
                      >
                        All Categories
                      </SelectItem>
                      {categories.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No categories available
                        </SelectItem>
                      ) : (
                        categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={fetchSubCategoriesData}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-primary"
                  aria-label="Refresh subcategory list"
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

        {/* SubCategories Table - remains the same */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {filteredAndSortedSubCategories.length === 0 && !loading ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No subcategories found
                  </h3>
                  <span className="text-muted-foreground mb-4">
                    Adjust your search or filters, or get started by creating
                    your first subcategory.
                  </span>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add SubCategory
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
                        Name {renderSortIcon("name")}
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category Name</TableHead>
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
                    {filteredAndSortedSubCategories.map((subcategory) => (
                      <TableRow key={subcategory.id}>
                        <TableCell className="font-medium text-foreground">
                          {subcategory.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md">
                          <div className="truncate">
                            {subcategory.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {categories.find(
                            (category) => category.id === subcategory.categoryId
                          )?.name || "Unknown Category"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <span>{formatDate(subcategory.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(subcategory.id)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                              disabled={loading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(subcategory)}
                              className="hover:text-primary-foreground hover:bg-primary"
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(subcategory.id)}
                              disabled={
                                isDeleting === subcategory.id || loading
                              }
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive border-border"
                            >
                              {isDeleting === subcategory.id ? (
                                <div className="flex items-center">
                                  <LoadingSpinner className="h-4 w-4 border-b-2 border-destructive mr-1" />
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
      </div>

      {/* Update Subcategory Dialog - remains the same */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="updateName"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="updateName"
                type="text"
                value={updateForm.name}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, name: e.target.value })
                }
                placeholder="Enter subcategory name"
                disabled={isUpdating}
                required
                maxLength={100} // Set max length for updated subcategory name
              />
            </div>
            <div>
              <label
                htmlFor="updateDescription"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Description
              </label>
              <Textarea
                id="updateDescription"
                value={updateForm.description}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, description: e.target.value })
                }
                placeholder="Enter subcategory description"
                disabled={isUpdating}
                rows={3}
                maxLength={500} // Set max length for updated subcategory description
              />
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
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Updating...
                  </div>
                ) : (
                  "Update Subcategory"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory Dialog - remains the same */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this subcategory? This action
              cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting === subCategoryToDeleteId}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting === subCategoryToDeleteId}
              >
                {isDeleting === subCategoryToDeleteId ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 border-b-2 border-destructive mr-1" />
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

export default AllSubCategoryPage;