// src/app/blog/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  List,
  Calendar,
  Save,
  XCircle,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  ImageIcon, // Added for image placeholder
  UploadCloud, // Added for explicit upload button
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// Dynamically import QuillEditor with SSR disabled
const QuillEditor = dynamic(() => import("react-quill"), { ssr: false });

// --- Type Definitions ---
interface BlogData {
  title: string;
  content?: string;
  thumbnailUrl?: string | null;
  [key: string]: any; // Keep index signature if other dynamic properties might exist
}

interface Image {
  id: string;
  url: string;
  isHeroImage: boolean;
  isLogo: boolean;
  isIcon: boolean;
  productId: string | null;
  categoryId: string | null;
  subCategoryId: string | null;
  blogId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Blog {
  id: string;
  data: BlogData;
  createdAt: string;
  updatedAt: string;
  image: Image | null;
}

interface PublicBlogsApiResponse {
  data: {
    blogs: Blog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  status: "success" | "error";
  message: string;
}

// --- Utility Functions ---
function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.error("Invalid date string:", dateString, e);
    return "Invalid Date";
  }
}

function getTextSnippetFromHtml(html: string, maxLength: number = 100): string {
  if (!html) return "No content";
  if (typeof window === "undefined") {
    return (
      html.substring(0, maxLength) + (html.length > maxLength ? "..." : "")
    );
  }
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const textContent = doc.body.textContent || "";
    if (textContent.length > maxLength) {
      return textContent.substring(0, maxLength) + "...";
    }
    return textContent;
  } catch (e) {
    console.error("Error parsing HTML for snippet:", e);
    return "Error parsing content";
  }
}

// --- Component ---
const AllBlogsPage = () => {
  const [allBlogsRaw, setAllBlogsRaw] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Blog | keyof BlogData | null>(
    "createdAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination states (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Create Blog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogContent, setNewBlogContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Update Blog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [updatedBlogTitle, setUpdatedBlogTitle] = useState("");
  const [updatedBlogContent, setUpdatedBlogContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Thumbnail states for the Update Dialog (REMOVED)
  // const [selectedThumbnailFile, setSelectedThumbnailFile] =
  //   useState<File | null>(null);
  // const [isThumbnailActionInProgress, setIsThumbnailActionInProgress] = useState(false); // New state for image specific actions

  // Delete Blog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [blogToDeleteId, setBlogToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // --- Fetch All Blogs (Initial Load) ---
  const fetchAllBlogsInitial = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<PublicBlogsApiResponse>(
        "/public/blog?includeRelations=true"
      );

      if (response.data.status === "success" && response.data.data?.blogs) {
        setAllBlogsRaw(response.data.data.blogs);
      } else {
        toast.error(response.data.message || "Failed to fetch blogs."); // Display toast error
        setAllBlogsRaw([]);
      }
    } catch (err: any) {
      console.error("Error fetching blogs:", err);
      toast.error(
        err.response?.data?.message ||
          "An unexpected error occurred while fetching blogs."
      ); // Display toast error
      setAllBlogsRaw([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBlogsInitial();
  }, [fetchAllBlogsInitial]);

  // --- Client-side Filtering, Sorting, and Pagination ---
  const processedBlogs = useMemo(() => {
    let filteredBlogs = [...allBlogsRaw];

    // 1. Apply Search Query (on title or content)
    if (searchQuery.trim()) {
      const lowerCaseSearch = searchQuery.trim().toLowerCase();
      filteredBlogs = filteredBlogs.filter(
        (blog) =>
          blog.data.title.toLowerCase().includes(lowerCaseSearch) ||
          (blog.data.content &&
            blog.data.content.toLowerCase().includes(lowerCaseSearch))
      );
    }

    // 2. Apply Date Filter (by createdAt)
    if (filterStartDate || filterEndDate) {
      filteredBlogs = filteredBlogs.filter((blog) => {
        const createdAtDate = new Date(blog.createdAt);
        let passesStartDate = true;
        let passesEndDate = true;

        if (filterStartDate) {
          const start = new Date(filterStartDate);
          start.setHours(0, 0, 0, 0);
          passesStartDate = createdAtDate >= start;
        }

        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          passesEndDate = createdAtDate <= end;
        }
        return passesStartDate && passesEndDate;
      });
    }

    // 3. Apply Sorting
    if (sortKey) {
      filteredBlogs.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (
          sortKey === "createdAt" ||
          sortKey === "updatedAt" ||
          sortKey === "id"
        ) {
          aValue = a[sortKey as keyof Blog];
          bValue = b[sortKey as keyof Blog];
        } else {
          aValue = a.data[sortKey as keyof BlogData];
          bValue = b.data[sortKey as keyof BlogData];
        }

        // Handle null/undefined values for sorting
        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          if (sortKey === "createdAt" || sortKey === "updatedAt") {
            const dateA = new Date(aValue).getTime();
            const dateB = new Date(bValue).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
          }
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }

    // 4. Apply Pagination
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

    return {
      paginatedBlogs,
      totalFilteredBlogs: filteredBlogs.length,
      totalPages,
    };
  }, [
    allBlogsRaw,
    searchQuery,
    filterStartDate,
    filterEndDate,
    sortKey,
    sortDirection,
    currentPage,
    itemsPerPage,
  ]);

  // Handlers for client-side operations
  const handleRefresh = () => {
    fetchAllBlogsInitial();
    setSearchQuery("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
    setSortKey("createdAt");
    setSortDirection("desc");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Blog | keyof BlogData) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (key: keyof Blog | keyof BlogData) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3 inline" />
      ) : (
        <ArrowDown className="ml-1 h-3 w-3 inline" />
      );
    }
    return null;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPagesDisplay = processedBlogs.totalPages;
  const currentBlogsToDisplay = processedBlogs.paginatedBlogs;

  // Calculate stats for cards
  const totalBlogsCount = allBlogsRaw.length;

  // --- Create Blog Handlers ---
  const handleOpenCreateDialog = () => {
    setNewBlogTitle("");
    setNewBlogContent("");
    setIsCreateDialogOpen(true);
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    if (!newBlogTitle.trim() || !newBlogContent.trim()) {
      toast.error("Title and Content are required fields.");
      setIsCreating(false);
      return;
    }

    const blogData: BlogData = {
      title: newBlogTitle,
      content: newBlogContent,
    };

    try {
      const response = await axiosInstance.post("/admin/blog", {
        data: blogData,
      });

      if (response.data.status === "success") {
        toast.success("Blog created successfully!");
        setIsCreateDialogOpen(false);
        fetchAllBlogsInitial();
      } else {
        toast.error(response.data.message || "Failed to create blog.");
      }
    } catch (err: any) {
      console.error("Error creating blog:", err);
      toast.error(err.response?.data?.message || "Error creating blog.");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Update Blog Handlers ---
  const handleOpenUpdateDialog = (blog: Blog) => {
    setCurrentBlog(blog);
    setUpdatedBlogTitle(blog.data.title);
    setUpdatedBlogContent(blog.data?.content || "");
    // setSelectedThumbnailFile(null); // Clear selected file when opening (REMOVED)
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    if (!currentBlog) return;

    if (!updatedBlogTitle.trim() || !updatedBlogContent.trim()) {
      toast.error("Title and Content cannot be empty.");
      setIsUpdating(false);
      return;
    }

    // This update only sends text content, not the thumbnail file.
    // The thumbnail is handled by separate functions. (REMOVED: Thumbnail specific logic)
    const finalBlogData: BlogData = {
      title: updatedBlogTitle,
      content: updatedBlogContent,
      // The thumbnailUrl should reflect the state on the backend.
      // If an image was uploaded/removed using the new buttons, fetchAllBlogsInitial()
      // should eventually update currentBlog with the new URL.
      // thumbnailUrl: currentBlog.image?.url || null, // REMOVED
    };

    try {
      const response = await axiosInstance.patch(
        `/admin/blog/${currentBlog.id}`,
        {
          data: finalBlogData,
        }
      );

      if (response.data.status === "success") {
        toast.success("Blog content updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllBlogsInitial(); // Refresh blogs to reflect any changes, including potential thumbnail updates
      } else {
        toast.error(response.data.message || "Failed to update blog content.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error updating blog content.");
      console.error("Error updating blog content:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Thumbnail Image Upload/Remove Handlers (REMOVED) ---
  // const handleThumbnailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setSelectedThumbnailFile(e.target.files[0]);
  //   } else {
  //     setSelectedThumbnailFile(null);
  //   }
  //   // Clear the input value to allow re-selecting the same file
  //   if (e.currentTarget) {
  //     e.currentTarget.value = '';
  //   }
  // };

  // const handleUploadThumbnail = async () => {
  //   if (!currentBlog || !selectedThumbnailFile) {
  //     toast.error("No file selected or blog not found.");
  //     return;
  //   }

  //   setIsThumbnailActionInProgress(true);
  //   const formData = new FormData();
  //   formData.append("image", selectedThumbnailFile);
  //   formData.append("blogId", currentBlog.id);

  //   try {
  //     // If an old image exists for this blog, delete it first
  //     if (currentBlog.image?.id) {
  //       try {
  //         await axiosInstance.delete(`/admin/image/${currentBlog.image.id}`);
  //         toast.info("Old thumbnail removed, uploading new one...");
  //       } catch (deleteError) {
  //         console.error("Failed to delete old thumbnail:", deleteError);
  //         toast.warning("Could not remove old thumbnail. Proceeding with upload.");
  //       }
  //     }

  //     const response = await axiosInstance.post("/admin/image", formData, {
  //       headers: {
  //         "Content-Type": "multipart/form-data",
  //       },
  //     });

  //     if (response.data.status === "success" && response.data.data?.image) {
  //       toast.success("Thumbnail uploaded successfully!");
  //       // Update the currentBlog state directly with the new image URL
  //       // This is important for the preview to update without a full re-fetch of all blogs
  //       setCurrentBlog(prev => prev ? { ...prev, image: response.data.data.image } : null);
  //       setSelectedThumbnailFile(null); // Clear selected file after successful upload
  //       fetchAllBlogsInitial(); // Re-fetch all blogs to ensure table data is consistent
  //     } else {
  //       toast.error(response.data.message || "Failed to upload thumbnail.");
  //     }
  //   } catch (err: any) {
  //     if (err.response && err.response.status === 413) {
  //       toast.error("Thumbnail image too large. Please upload an image smaller than 5MB.");
  //     } else {
  //       toast.error(err.response?.data?.message || "Error uploading thumbnail.");
  //     }
  //     console.error("Upload thumbnail error:", err);
  //   } finally {
  //     setIsThumbnailActionInProgress(false);
  //   }
  // };

  // const handleRemoveCurrentThumbnail = async () => {
  //   if (!currentBlog?.image?.id) {
  //     toast.info("No current thumbnail to remove.");
  //     setSelectedThumbnailFile(null); // Clear any pending selection
  //     return;
  //   }

  //   setIsThumbnailActionInProgress(true);
  //   try {
  //     const response = await axiosInstance.delete(`/admin/image/${currentBlog.image.id}`);
  //     if (response.data.status === "success") {
  //       toast.success("Thumbnail image removed successfully!");
  //       setCurrentBlog(prev => prev ? { ...prev, image: null } : null); // Clear image from currentBlog state
  //       setSelectedThumbnailFile(null); // Ensure no selected file is pending
  //       fetchAllBlogsInitial(); // Re-fetch all blogs
  //     } else {
  //       toast.error(response.data.message || "Failed to remove thumbnail image.");
  //     }
  //   } catch (err: any) {
  //     console.error("Error removing thumbnail:", err);
  //     toast.error(err.response?.data?.message || "Error removing thumbnail image.");
  //   } finally {
  //     setIsThumbnailActionInProgress(false);
  //   }
  // };


  // --- Delete Blog Handlers ---
  const handleOpenDeleteDialog = (blogId: string) => {
    setBlogToDeleteId(blogId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogToDeleteId) return;

    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete(
        `/admin/blog/${blogToDeleteId}`
      );

      if (response.data.status === "success") {
        toast.success("Blog deleted successfully!");
        setIsDeleteDialogOpen(false);
        setBlogToDeleteId(null);
        fetchAllBlogsInitial();
      } else {
        toast.error(response.data.message || "Failed to delete blog.");
      }
    } catch (err: any) {
      console.error("Error deleting blog:", err);
      toast.error(err.response?.data?.message || "Error deleting blog.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <List className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Blog Management
                </h1>
                <p className="text-muted-foreground">
                  Manage and monitor your blog posts with ease
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenCreateDialog}
              className="hover:bg-primary"
              disabled={loading}
            >
              <Plus className="h-5 w-5 mr-2" /> Create New Blog
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Only Total Blogs remains */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Blogs
                </CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {totalBlogsCount}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          {/* Removed Published, Draft, Archived Blog Cards */}
        </div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Input (full width on small screens, flex-1 on larger) */}
              <div className="relative w-full lg:w-auto flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  id="searchQuery"
                  placeholder="Search by title or content..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10"
                  aria-label="Search blogs"
                  disabled={loading}
                />
              </div>

              {/* Filter Selects and Date Pickers Group - Only Date Filters remain */}
              <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-4 items-center w-full lg:w-auto">
                {/* Date Filters Group */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    id="filterStartDate"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full sm:w-[150px]"
                    disabled={loading}
                    aria-label="Filter by start date"
                  />
                  <Input
                    id="filterEndDate"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full sm:w-[150px]"
                    disabled={loading}
                    aria-label="Filter by end date"
                  />
                </div>

                {/* Reset Filters Button */}
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 w-full sm:w-auto hover:bg-primary"
                  aria-label="Reset blog list filters"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Reset Filters
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Main Content Area - Conditional Rendering */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Posted At</TableHead>
                      <TableHead>Last Edited At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(10)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
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
        ) : (currentBlogsToDisplay?.length ?? 0) === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    No blogs found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first blog post or adjust your
                    filters.
                  </p>
                  <Button
                    onClick={handleOpenCreateDialog}
                    className="hover:bg-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" /> Create New Blog
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
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("title")}
                      >
                        Title{renderSortIcon("title")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Posted At{renderSortIcon("createdAt")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("updatedAt")}
                      >
                        Last Edited At{renderSortIcon("updatedAt")}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentBlogsToDisplay.map((blog) => (
                      <TableRow key={blog.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {blog.data.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center">
                            {formatDate(blog.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center">
                            {formatDate(blog.updatedAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenUpdateDialog(blog)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/blog/${blog.id}`)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDeleteDialog(blog.id)}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
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

        {/* Pagination */}
        {totalPagesDisplay > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"
          >
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              variant="outline"
              size="sm"
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm sm:text-base">
              Page {currentPage} of {totalPagesDisplay}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPagesDisplay || loading}
              variant="outline"
              size="sm"
              aria-label="Next page"
            >
              Next
            </Button>
          </motion.div>
        )}
      </div>

      {/* --- Dialogs --- */}
      {/* Create Blog Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Blog Post</DialogTitle>
            <DialogDescription>
              Fill in the details for your new blog post. Fields marked with{" "}
              <span className="text-red-500">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBlog} className="grid gap-6 py-4">
            {/* Title Field */}
            <div className="grid grid-cols-1 items-center gap-2">
              <Label htmlFor="newBlogTitle" className="text-left text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newBlogTitle"
                value={newBlogTitle}
                onChange={(e) => setNewBlogTitle(e.target.value)}
                required
                disabled={isCreating}
                placeholder="Enter blog title"
              />
            </div>

            {/* Content Field (Quill Editor) */}
            <div className="grid grid-cols-1 gap-2">
              <Label
                htmlFor="newBlogContent"
                className="text-left text-sm font-medium"
              >
                Content <span className="text-red-500">*</span>
              </Label>
              <div className="h-[300px] flex flex-col border rounded-md overflow-hidden">
                <QuillEditor
                  theme="snow"
                  value={newBlogContent}
                  onChange={setNewBlogContent}
                  className="editor flex-grow bg-card text-card-foreground overflow-auto"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, 4, 5, 6, false] }],
                      ["bold", "italic", "underline", "strike", "blockquote"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      [{ indent: "-1" }, { indent: "+1" }],
                      ["link", "image", "video"],
                      ["clean"],
                    ],
                  }}
                  formats={[
                    "header",
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                    "blockquote",
                    "list",
                    "bullet",
                    "indent",
                    "link",
                    "image",
                    "video",
                  ]}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
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
                  <>
                    <Plus className="h-4 w-4 mr-2" /> Create Blog
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Blog Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Make changes to the blog post here.
            </DialogDescription>
          </DialogHeader>
          {currentBlog && (
            <form onSubmit={handleUpdateBlog} className="grid gap-6 py-4">
              {/* Title Field */}
              <div className="grid grid-cols-1 items-center gap-2">
                <Label htmlFor="updatedBlogTitle" className="text-left text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="updatedBlogTitle"
                  value={updatedBlogTitle}
                  onChange={(e) => setUpdatedBlogTitle(e.target.value)}
                  required
                  disabled={isUpdating}
                  placeholder="Enter blog title"
                />
              </div>

              {/* Content Field (Quill Editor) */}
              <div className="grid grid-cols-1 gap-2">
                <Label
                  htmlFor="updatedBlogContent"
                  className="text-left text-sm font-medium"
                >
                  Content
                </Label>
                <div className="h-[300px] flex flex-col border rounded-md overflow-hidden">
                  <QuillEditor
                    theme="snow"
                    value={updatedBlogContent}
                    onChange={setUpdatedBlogContent}
                    className="editor flex-grow bg-card text-card-foreground overflow-auto"
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, 4, 5, 6, false] }],
                        ["bold", "italic", "underline", "strike", "blockquote"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        [{ indent: "-1" }, { indent: "+1" }],
                        ["link", "image", "video"],
                        ["clean"],
                      ],
                    }}
                    formats={[
                      "header",
                      "bold",
                      "italic",
                      "underline",
                      "strike",
                      "blockquote",
                      "list",
                      "bullet",
                      "indent",
                      "link",
                      "image",
                      "video",
                    ]}
                  />
                </div>
              </div>

              {/* Thumbnail Image Section (REMOVED) */}
              {/*
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="thumbnailFile" className="text-left text-sm font-medium">
                  Thumbnail Image (Optional)
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-muted/20">
                  <div className="relative w-56 h-56 rounded-md overflow-hidden border border-border flex-shrink-0 bg-background flex items-center justify-center">
                    {selectedThumbnailFile ? (
                      <img
                        src={URL.createObjectURL(selectedThumbnailFile)}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : currentBlog.image?.url ? (
                      <img
                        src={currentBlog.image.url}
                        alt="Current Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground/60" />
                    )}

                    {isThumbnailActionInProgress && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <LoadingSpinner className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="flex-grow w-full flex flex-col gap-2">
                    <Input
                      id="thumbnailFile"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileSelect}
                      className="w-full"
                      disabled={isUpdating || isThumbnailActionInProgress}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a new image to replace the current one (max 5MB).
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleUploadThumbnail}
                        disabled={!selectedThumbnailFile || isThumbnailActionInProgress || isUpdating}
                      >
                        {isThumbnailActionInProgress ? (
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                        ) : (
                            <UploadCloud className="h-4 w-4 mr-2" />
                        )}
                        Upload New Thumbnail
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveCurrentThumbnail}
                        disabled={!currentBlog.image?.id || isThumbnailActionInProgress || isUpdating}
                      >
                        {isThumbnailActionInProgress ? (
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                        ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Remove Current
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              */}

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                  disabled={isUpdating} 
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating /* || isThumbnailActionInProgress */}> {/* Adjusted disabled prop */}
                  {isUpdating ? (
                    <div className="flex items-center">
                      <LoadingSpinner className="h-4 w-4 mr-2" /> Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Blog Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this blog post? This action cannot
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
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />{" "}
                    Deleting...
                  </div>
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

export default AllBlogsPage;