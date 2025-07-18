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
  DialogFooter
} from "@/components/ui/dialog";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit, FolderOpen, Plus, Trash2, Search, ArrowUp, ArrowDown, Eye } from "lucide-react"; // Added Eye icon

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
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
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Category | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    fetchCategoriesData();
  }, []);

  const fetchCategoriesData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<CategoriesApiResponse>(
        "/public/category"
      );
      if (response.data.status === "success" && response.data.data) {
        setCategories(response.data.data.categories || []);
        setTotal(response.data.data.total || 0);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch categories");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    let currentCategories = [...categories];

    if (searchQuery) {
      currentCategories = currentCategories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (category.description &&
            category.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (sortKey) {
      currentCategories.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

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

    return currentCategories;
  }, [categories, searchQuery, sortKey, sortDirection]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsCreating(true);
    try {
      const response = await axiosInstance.post("/admin/category", {
        name: createForm.name,
        description: createForm.description,
      });
      if (response.data.status === "success" && response.data.data) {
        setCreateForm({ name: "", description: "" });
        toast.success("Category created successfully");
        setIsCreateDialogOpen(false);
        fetchCategoriesData();
      } else {
        toast.error(response.data.message || "Failed to create category");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdateDialog = (category: Category) => {
    setUpdateForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
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
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (id: string) => {
    setCategoryToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDeleteId) return;

    setIsDeleting(categoryToDeleteId);
    try {
      const response = await axiosInstance.delete(
        `/admin/category/${categoryToDeleteId}`
      );
      if (response.data.status === "success") {
        setCategories(categories.filter((cat) => cat.id !== categoryToDeleteId));
        setTotal(total - 1);
        toast.success("Category deleted successfully");
      } else {
        toast.error(response.data.message || "Failed to delete category");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(null);
      setIsDeleteDialogOpen(false);
      setCategoryToDeleteId(null);
    }
  };

  const handleSort = (key: keyof Category) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof Category) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // New function to handle navigation to details page
  const handleViewDetails = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
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
              <div className="flex items-center space-x-4">
                <Badge className="text-sm">
                  {filteredAndSortedCategories.length} Categories Displayed ({total} Total)
                </Badge>
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
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
                          disabled={isCreating}
                          required
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
                          disabled={isCreating}
                          rows={3}
                        />
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
                            "Create Category"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2"
            aria-label="Search categories"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <div className="text-destructive-foreground text-center font-medium">
                {error}
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedCategories.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No categories found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Adjust your search or filters, or get started by creating your first category
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                Manage and organize your content categories
              </CardDescription>
            </CardHeader>
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
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(category.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {/* New "View More Details" button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(category.id)}
                            className="hover:bg-primary border-border"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUpdateDialog(category)}
                            className="hover:bg-primary"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            disabled={isDeleting === category.id}
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
        )}
      </div>

      {/* Update Category Dialog */}
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
                disabled={isUpdating}
                required
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
                disabled={isUpdating}
                rows={3}
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
                  "Update Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting === categoryToDeleteId}
              >
                {isDeleting === categoryToDeleteId ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />
                    Deleting...
                  </div>
                ) : (
                  "Delete Category"
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