"use client";

import { ApiResponse, axiosInstance } from "@/lib/axios";
import {
  CategoriesApiResponse,
  Category as OriginalCategory,
  BatchImagesApiResponse,
} from "@/types/schemas";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Edit,
  FolderOpen,
  Plus,
  Trash2,
  Search,
  Eye,
  RefreshCw,
  MoreHorizontal,
  ImageIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Extend the original Category type to include the optional imageUrl
type Category = OriginalCategory & { imageUrl?: string };

// Helper function to format dates
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const AllCategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createFormErrors, setCreateFormErrors] = useState<{ name?: string }>(
    {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [updateFormErrors, setUpdateFormErrors] = useState<{ name?: string }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Category | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortDropdown, setSortDropdown] = useState<"name" | "createdAt">(
    "createdAt"
  );

  const router = useRouter();

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

  const fetchCategoriesData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<CategoriesApiResponse>(
        "/public/category"
      );

      let fetchedCategories: Category[] = [];
      if (response.data.status === "success" && response.data.data) {
        fetchedCategories = response.data.data.categories || [];
        setTotal(response.data.data.total || 0);
      } else {
        toast.error(response.data.message || "Failed to fetch categories");
        setLoading(false);
        return;
      }

      const imageIds = fetchedCategories
        .map((cat) => cat.imageId)
        .filter((id): id is string => id !== null);

      if (imageIds.length > 0) {
        try {
          const imageRes = await axiosInstance.post<BatchImagesApiResponse>(
            "/public/image/batch",
            { ids: imageIds }
          );

          if (
            imageRes.data.status === "success" &&
            imageRes.data.data?.images
          ) {
            const imageUrlMap = new Map<string, string>();
            imageRes.data.data.images.forEach((image) => {
              imageUrlMap.set(image.id, image.url);
            });

            fetchedCategories = fetchedCategories.map((cat) => ({
              ...cat,
              imageUrl: cat.imageId ? imageUrlMap.get(cat.imageId) : undefined,
            }));
          } else {
            toast.warning("Could not fetch some category images.");
          }
        } catch (imgErr) {
          toast.warning("Could not fetch category images.");
        }
      }

      setCategories(fetchedCategories);
    } catch (err: any) {
      toast.error(
        err.message || "An unexpected error occurred while fetching categories."
      );
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
            category.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }
    if (sortKey) {
      currentCategories.sort((a, b) => {
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
    return currentCategories;
  }, [categories, searchQuery, sortKey, sortDirection]);

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
      let imageId: string | undefined;
      if (createImageFile) {
        const formData = new FormData();
        formData.append("image", createImageFile);
        const imageRes = await axiosInstance.post("/admin/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (
          imageRes?.data?.status === "success" &&
          imageRes?.data?.data?.image?.id
        ) {
          imageId = imageRes.data.data.image.id as string;
        } else {
          toast.error(imageRes?.data?.message || "Failed to upload image");
          setIsCreating(false);
          return;
        }
      }
      const payload: { name: string; description?: string; imageId?: string } =
        {
          name: createForm.name.trim(),
        };
      if (createForm.description.trim()) {
        payload.description = createForm.description.trim();
      }
      if (imageId) {
        payload.imageId = imageId;
      }
      const categoryRes = await axiosInstance.post("/admin/category", payload);
      if (
        categoryRes.data.status === "success" &&
        categoryRes.data.data?.category
      ) {
        toast.success("Category created successfully");
        setCreateForm({ name: "", description: "" });
        setCreateImageFile(null);
        setIsCreateDialogOpen(false);
        fetchCategoriesData();
      } else {
        toast.error(categoryRes.data.message || "Failed to create category");
      }
    } catch (err: any) {
      let apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong. Please try again.";
      if (
        typeof apiMessage === "string" &&
        apiMessage.toLowerCase().includes("duplicate")
      ) {
        apiMessage = "A category with this name already exists.";
      }
      toast.error(apiMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>,
    categoryId: string
  ) => {
    e.preventDefault();
    setUpdateFormErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("imageFile") as File;

    const errors = validateCategoryForm(name);
    if (Object.keys(errors).length > 0) {
      setUpdateFormErrors(errors);
      return;
    }

    setIsUpdating(true);
    try {
      let imageId: string | undefined;
      if (imageFile && imageFile.size > 0) {
        const imageFormData = new FormData();
        imageFormData.append("image", imageFile);
        const imageRes = await axiosInstance.post(
          "/admin/image",
          imageFormData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        if (
          imageRes?.data?.status === "success" &&
          imageRes?.data?.data?.image?.id
        ) {
          imageId = imageRes.data.data.image.id as string;
        } else {
          toast.error(imageRes?.data?.message || "Failed to upload image");
          setIsUpdating(false);
          return;
        }
      }

      const payload: { name: string; description?: string; imageId?: string } =
        {
          name: name.trim(),
        };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (imageId) {
        payload.imageId = imageId;
      }

      const response = await axiosInstance.patch(
        `/admin/category/${categoryId}`,
        payload
      );

      if (response.data.status === "success") {
        toast.success("Category updated successfully");
        fetchCategoriesData();
        // This will programmatically close all shadcn dialogs.
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      } else {
        toast.error(response.data.message || "Failed to update category");
      }
    } catch (err: any) {
      let apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong. Please try again.";
      if (
        typeof apiMessage === "string" &&
        apiMessage.toLowerCase().includes("duplicate")
      ) {
        apiMessage = "A category with this name already exists.";
      }
      toast.error(apiMessage);
    } finally {
      setIsUpdating(false);
      setUpdateFormErrors({});
    }
  };

  const handleConfirmDelete = async (categoryId: string) => {
    if (!categoryId) return;
    setIsDeleting(categoryId);
    try {
      const response = await axiosInstance.delete(
        `/admin/category/${categoryId}`
      );
      if (response.data.status === "success") {
        setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        setTotal((prevTotal) => prevTotal - 1);
        toast.success("Category deleted successfully");
      } else {
        toast.error(response.data.message || "Failed to delete category");
      }
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "An unexpected error occurred while deleting category.";
      toast.error(apiMessage);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleViewDetails = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background">
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
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      placeholder="Enter category name"
                      disabled={isCreating || loading}
                      required
                      maxLength={100}
                    />
                    {createFormErrors.name && (
                      <span className="text-destructive text-xs mt-1 block">
                        {createFormErrors.name}
                      </span>
                    )}
                  </div>
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
                      maxLength={500}
                    />
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
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
        </motion.div>

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
                  maxLength={100}
                />
              </div>
              <div className="flex flex-row gap-4 items-center">
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
                      className="w-[220px] pl-3 pr-4 py-2"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-1" />
                  </CardContent>
                  <CardFooter className="p-4 flex justify-between items-center">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedCategories.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No categories found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters, or create your first
                    category.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedCategories.map((category) => (
                <motion.div
                  key={category.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                    <CardHeader className="p-0">
                      <div className="aspect-video w-full bg-muted flex items-center justify-center">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="h-full max-h-[200px] w-auto object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                      <CardTitle className="text-lg font-semibold truncate">
                        {category.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm line-clamp-2">
                        {category.description || "No description available."}
                      </CardDescription>
                    </CardContent>
                    <CardFooter className="p-4 bg-muted/50 flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(category.createdAt)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(category.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View</span>
                          </DropdownMenuItem>

                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                              </DialogHeader>
                              <form
                                onSubmit={(e) => handleUpdate(e, category.id)}
                                className="space-y-4"
                              >
                                <div>
                                  <label
                                    htmlFor="updateName"
                                    className="block text-sm font-medium text-foreground mb-1"
                                  >
                                    Name{" "}
                                    <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="updateName"
                                    name="name"
                                    type="text"
                                    defaultValue={category.name}
                                    placeholder="Enter category name"
                                    disabled={isUpdating}
                                    required
                                    maxLength={100}
                                  />
                                  {updateFormErrors.name && (
                                    <span className="text-destructive text-xs mt-1 block">
                                      {updateFormErrors.name}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <label
                                    htmlFor="updateImage"
                                    className="block text-sm font-medium text-foreground mb-1"
                                  >
                                    Replace Image (Optional)
                                  </label>
                                  <Input
                                    id="updateImage"
                                    name="imageFile"
                                    type="file"
                                    accept="image/*"
                                    className="h-fit file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                    disabled={isUpdating}
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
                                    name="description"
                                    defaultValue={category.description || ""}
                                    placeholder="Enter category description"
                                    disabled={isUpdating}
                                    rows={3}
                                    maxLength={500}
                                  />
                                </div>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={isUpdating}
                                    >
                                      Cancel
                                    </Button>
                                  </DialogClose>
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

                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                disabled={isDeleting === category.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                              </DialogHeader>
                              <p>
                                Are you sure you want to delete the category "
                                <strong>{category.name}</strong>"? This action
                                cannot be undone.
                              </p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button
                                    variant="outline"
                                    disabled={!!isDeleting}
                                  >
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleConfirmDelete(category.id)
                                  }
                                  disabled={!!isDeleting}
                                >
                                  {isDeleting === category.id ? (
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
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AllCategoryPage;
