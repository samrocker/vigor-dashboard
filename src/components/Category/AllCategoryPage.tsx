"use client";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import { CategoriesApiResponse, Category } from "@/types/schemas";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { toast } from "sonner"; // Changed from react-toastify
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Edit,
  FolderOpen,
  Plus,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react"; // Added RefreshCw and Info icon
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { motion } from "framer-motion"; // Added motion import
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Helper function to format dates
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

const AllCategoryPage = () => {
  // State variables for categories data and loading/error states
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // State for create form
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  // NEW: State for the category image file
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);

  // State for update form
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    description: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // State for delete operation
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(
    null
  );

  // State for search and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Category | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortDropdown, setSortDropdown] = useState<"name" | "createdAt">(
    "createdAt"
  ); // For sort dropdown

  const [createFormErrors, setCreateFormErrors] = useState<{ name?: string }>(
    {}
  );
  const [updateFormErrors, setUpdateFormErrors] = useState<{ name?: string }>(
    {}
  );

  // Initialize useRouter for navigation
  const router = useRouter();

  // Effect hook to fetch categories on component mount
  useEffect(() => {
    fetchCategoriesData();
  }, []);

  function validateCategoryForm(name: string) {
    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Name is required";
    else if (name.trim().length < 2)
      errors.name = "Name must be at least 2 characters";
    else if (name.trim().length > 100)
      errors.name = "Name must be at most 100 characters";
    return errors;
  }

  // Function to fetch categories data from the API
  const fetchCategoriesData = async () => {
    setLoading(true); // Set loading to true before fetching
    try {
      const response = await axiosInstance.get<CategoriesApiResponse>(
        "/public/category"
      );
      if (response.data.status === "success" && response.data.data) {
        setCategories(response.data.data.categories || []); // Update categories state
        setTotal(response.data.data.total || 0); // Update total count
      } else {
        toast.error(response.data.message || "Failed to fetch categories"); // Show error toast
      }
    } catch (err: any) {
      toast.error(
        err.message || "An unexpected error occurred while fetching categories."
      ); // Show unexpected error toast
    } finally {
      setLoading(false); // Set loading to false after fetch completes
    }
  };

  // Memoized filtered and sorted categories for performance optimization
  const filteredAndSortedCategories = useMemo(() => {
    let currentCategories = [...categories];

    // Apply search query filter
    if (searchQuery) {
      currentCategories = currentCategories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (category.description &&
            category.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting based on sortKey and sortDirection
    if (sortKey) {
      currentCategories.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        // Handle null or undefined values for sorting
        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        // String comparison for name
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        // Date comparison for createdAt/updatedAt
        if (sortKey === "createdAt" || sortKey === "updatedAt") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0; // Default return for other types or if values are equal
      });
    }

    return currentCategories;
  }, [categories, searchQuery, sortKey, sortDirection]); // Dependencies for memoization

  // MODIFIED: Handler for creating a new category and uploading an image
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormErrors({});
    const errors = validateCategoryForm(createForm.name);
    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }
    setIsCreating(true);
    try {
      // Step 1: Create the category
      const response = await axiosInstance.post("/admin/category", createForm);

      if (response.data.status === "success" && response.data.data) {
        const newCategory = response.data.data.category;

        // Step 2: Upload the image if one is selected
        if (createImageFile) {
          const formData = new FormData();
          formData.append("image", createImageFile);
          // Using 'productId' as the key, as specified in the form-data screenshot
          formData.append("categoryId", newCategory.id);

          try {
            const imageResponse = await axiosInstance.post(
              "/admin/image",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            if (imageResponse.data.status === "success") {
            } else {
              toast.error(
                imageResponse.data.message || "Failed to upload image"
              );
            }
          } catch (imgErr: any) {
            toast.error(
              imgErr?.response?.data?.message ||
                "Category was created, but image upload failed."
            );
          }
        }

        // Step 3: Reset state and refetch data
        setCreateForm({ name: "", description: "" });
        setCreateImageFile(null); // Reset image file state
        setIsCreateDialogOpen(false);
        fetchCategoriesData(); // Refresh the list
      } else {
        toast.error(response.data.message || "Failed to create category");
      }
    } catch (err: any) {
      let apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong. Please try again.";
      if (apiMessage.toLowerCase().includes("duplicate")) {
        apiMessage = "A category with this name already exists.";
      }
      toast.error(apiMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Function to open the update dialog with category data
  const openUpdateDialog = (category: Category) => {
    setUpdateForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
    });
    setIsUpdateDialogOpen(true); // Open update dialog
  };

  // Handler for updating an existing category
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateFormErrors({});
    const errors = validateCategoryForm(updateForm.name);
    if (Object.keys(errors).length > 0) {
      setUpdateFormErrors(errors);
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axiosInstance.patch(
        `/admin/category/${updateForm.id}`,
        {
          name: updateForm.name,
          description: updateForm.description,
        }
      );
      if (response.data.status === "success") {
        setCategories(
          categories.map((cat) =>
            cat.id === updateForm.id
              ? {
                  ...cat,
                  name: updateForm.name,
                  description: updateForm.description,
                }
              : cat
          )
        );
        setIsUpdateDialogOpen(false);
        toast.success("Category updated successfully");
      } else {
        toast.error(response.data.message || "Failed to update category");
      }
    } catch (err: any) {
      let apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong. Please try again.";
      if (apiMessage.toLowerCase().includes("duplicate")) {
        apiMessage = "A category with this name already exists.";
      }
      toast.error(apiMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handler to initiate category deletion
  const handleDelete = (id: string) => {
    setCategoryToDeleteId(id); // Set ID of category to delete
    setIsDeleteDialogOpen(true); // Open delete confirmation dialog
  };

  // Handler to confirm and execute category deletion
  const handleConfirmDelete = async () => {
    if (!categoryToDeleteId) return; // Do nothing if no category ID is set

    setIsDeleting(categoryToDeleteId); // Set deleting state for the specific category
    try {
      const response = await axiosInstance.delete(
        `/admin/category/${categoryToDeleteId}`
      );
      if (response.data.status === "success") {
        // Remove the deleted category from local state
        setCategories(
          categories.filter((cat) => cat.id !== categoryToDeleteId)
        );
        setTotal(total - 1); // Decrement total count
        toast.success("Category deleted successfully"); // Show success toast
      } else {
        toast.error(response.data.message || "Failed to delete category"); // Show error toast
      }
    } catch (err: any) {
      toast.error(
        err.message || "An unexpected error occurred while deleting category."
      ); // Show unexpected error toast
    } finally {
      setIsDeleting(null); // Reset deleting state
      setIsDeleteDialogOpen(false); // Close dialog
      setCategoryToDeleteId(null); // Clear category ID
    }
  };

  // Handler for sorting table columns
  const handleSort = (key: keyof Category) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc"); // Toggle sort direction
    } else {
      setSortKey(key); // Set new sort key
      setSortDirection("asc"); // Default to ascending for new sort key
    }
  };

  // Renders sort icon based on current sort key and direction
  const renderSortIcon = (key: keyof Category) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // Function to handle navigation to category details page
  const handleViewDetails = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header section with title and Add Category button */}
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
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Categories
                </h1>
                <p className="text-muted-foreground">
                  Manage your content categories
                </p>
              </div>
            </div>
            {/* Dialog for creating a new category - remains here */}
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
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
                      placeholder="Enter category name"
                      disabled={isCreating || loading}
                      required
                      maxLength={100} // Added max length for category name
                    />
                  </div>
                  {/* NEW: File input for category image */}
                  <div>
                    <label
                      htmlFor="createImage"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      Image (Optional)
                    </label>
                    <Input
                      id="createImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setCreateImageFile(e.target.files[0]);
                        } else {
                          setCreateImageFile(null);
                        }
                      }}
                      disabled={isCreating || loading}
                      className="h-fit file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
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
                      placeholder="Enter category description"
                      disabled={isCreating || loading}
                      rows={3}
                      maxLength={500} // Added max length for description
                    />
                    {createFormErrors.name && (
                      <span className="text-destructive text-xs mt-1 block">
                        {createFormErrors.name}
                      </span>
                    )}
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating || loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating || loading}>
                      {isCreating ? (
                        <div className="flex items-center">
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Creating...
                        </div>
                      ) : (
                        "Create Category"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Main content area with stat cards, search, filters, and category table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Categories
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
                {filteredAndSortedCategories.length} currently displayed
              </p>
            </CardContent>
          </Card>
          {/* You can add more stat cards here if needed, e.g., for active categories, drafts, etc. */}
        </motion.div>

        {/* Search Input and Sort Dropdown - remains the same */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-auto flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search categories by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                  aria-label="Search categories"
                  disabled={loading}
                  maxLength={100} // Added max length for search query
                />
              </div>
              <div className="flex flex-row gap-4 items-center">
                {/* Refresh Button */}
                <Button
                  variant="outline"
                  onClick={fetchCategoriesData}
                  disabled={loading}
                  className="hover:bg-primary flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                {/* Sort Dropdown */}
                <div className="relative">
                  <label htmlFor="sort-dropdown" className="sr-only">
                    Sort by
                  </label>
                  <Select
                    value={sortDropdown}
                    onValueChange={(val: "name" | "createdAt") => {
                      setSortDropdown(val);
                      setSortKey(val);
                      setSortDirection(val === "name" ? "asc" : "desc");
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger
                      id="sort-dropdown"
                      className="w-[220px] pl-3 pr-4 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">
                        Sort by Created Date
                      </SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Conditional rendering based on loading or data presence */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredAndSortedCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No categories found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters, or get started by creating
                    your first category
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
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
                    {filteredAndSortedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">
                          {category.description || "No description"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <span>{formatDate(category.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(category.id)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(category)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              disabled={isDeleting === category.id || loading}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              {isDeleting === category.id ? (
                                <div className="flex items-center">
                                  <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />
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
          </motion.div>
        )}
      </motion.div>

      {/* Update Category Dialog - remains the same */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
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
                placeholder="Enter category name"
                disabled={isUpdating || loading}
                required
                maxLength={100} // Added max length for category name
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
                placeholder="Enter category description"
                disabled={isUpdating || loading}
                rows={3}
                maxLength={500} // Added max length for description
              />
              {updateFormErrors.name && (
                <span className="text-destructive text-xs mt-1 block">
                  {updateFormErrors.name}
                </span>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={isUpdating || loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || loading}>
                {isUpdating ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Updating...
                  </div>
                ) : (
                  "Update Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog - remains the same */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this category? This action cannot
              be undone.
            </p>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting === categoryToDeleteId || loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting === categoryToDeleteId || loading}
              >
                {isDeleting === categoryToDeleteId ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />
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

export default AllCategoryPage;
