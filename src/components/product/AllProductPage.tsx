// src/components/blogs/AllBlogsPage.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import QuillEditor from "react-quill";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Plus,
  Edit,
  Trash2,
  List,
  Calendar,
  Save,
  XCircle,
  Filter,
  Search,
  ArrowUp, // For sorting
  ArrowDown, // For sorting
  RefreshCw, // For refresh button
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed useDebounce as we are now doing client-side filtering

// --- Type Definitions ---
interface BlogData {
  title: string;
  content?: string;
  author?: string;
  tags?: string[];
  category?: string;
  status?: string;
  thumbnailUrl?: string;
  seoKeywords?: string;
  readTimeMinutes?: number;
  [key: string]: any; // Allows for additional properties if they appear
}

interface Blog {
  id: string;
  data: BlogData; // Use the new BlogData interface here
  createdAt: string;
  updatedAt: string;
  image: string | null;
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    console.error("Invalid date string:", dateString, e);
    return "Invalid Date";
  }
}

function getTextSnippetFromHtml(html: string, maxLength: number = 100): string {
  if (!html) return 'No content';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const textContent = doc.body.textContent || '';
    if (textContent.length > maxLength) {
      return textContent.substring(0, maxLength) + '...';
    }
    return textContent;
  } catch (e) {
    console.error("Error parsing HTML for snippet:", e);
    return "Error parsing content";
  }
}

// --- Component ---
const AllBlogsPage = () => {
  const [allBlogsRaw, setAllBlogsRaw] = useState<Blog[]>([]); // Stores all fetched blogs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(""); // For general search (title/content)
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // Default to "all" for the Select component

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof BlogData | null>("createdAt"); // Sort by keys within blog.data
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination states (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Fixed items per page

  // Create Blog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogContent, setNewBlogContent] = useState("");
  const [newBlogAuthor, setNewBlogAuthor] = useState("");
  const [newBlogCategory, setNewBlogCategory] = useState("");
  const [newBlogTags, setNewBlogTags] = useState("");
  const [newBlogThumbnailUrl, setNewBlogThumbnailUrl] = useState("");
  const [newBlogSeoKeywords, setNewBlogSeoKeywords] = useState("");
  const [newBlogReadTime, setNewBlogReadTime] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);

  // Update Blog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [updatedBlogTitle, setUpdatedBlogTitle] = useState("");
  const [updatedBlogContent, setUpdatedBlogContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Blog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [blogToDeleteId, setBlogToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Fetch All Blogs (Initial Load) ---
  // This now fetches ALL blogs, without filters, to be processed client-side
  const fetchAllBlogsInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Removed /v1 and any filter query params from the initial fetch
      const response = await axiosInstance.get<PublicBlogsApiResponse>("/public/blog?includeRelations=true");

      if (response.data.status === "success" && response.data.data?.blogs) {
        setAllBlogsRaw(response.data.data.blogs);
      } else {
        setError(response.data.message || "Failed to fetch blogs.");
        setAllBlogsRaw([]);
      }
    } catch (err: any) {
      console.error("Error fetching blogs:", err);
      setError(err.response?.data?.message || "An unexpected error occurred while fetching blogs.");
      setAllBlogsRaw([]);
      toast.error("Failed to load blogs.");
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

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
          (blog.data.content && blog.data.content.toLowerCase().includes(lowerCaseSearch))
      );
    }

    // 2. Apply Author Filter
    if (filterAuthor.trim()) {
      const lowerCaseAuthorFilter = filterAuthor.trim().toLowerCase();
      filteredBlogs = filteredBlogs.filter(
        (blog) =>
          blog.data.author && blog.data.author.toLowerCase().includes(lowerCaseAuthorFilter)
      );
    }

    // 3. Apply Category Filter
    if (filterCategory.trim()) {
      const lowerCaseCategoryFilter = filterCategory.trim().toLowerCase();
      filteredBlogs = filteredBlogs.filter(
        (blog) =>
          blog.data.category && blog.data.category.toLowerCase().includes(lowerCaseCategoryFilter)
      );
    }

    // 4. Apply Status Filter
    if (filterStatus !== "all") {
      filteredBlogs = filteredBlogs.filter(
        (blog) => blog.data.status === filterStatus
      );
    }

    // 5. Apply Sorting
    if (sortKey) {
      filteredBlogs.sort((a, b) => {
        const aValue = a.data[sortKey];
        const bValue = b.data[sortKey];

        // Handle null/undefined values for sorting
        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        // Special handling for date strings (createdAt, updatedAt)
        if (sortKey === "createdAt" || sortKey === "updatedAt") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0; // Fallback for other types or if values are equal
      });
    }

    // 6. Apply Pagination
    const totalFilteredItems = filteredBlogs.length;
    const newTotalPages = Math.ceil(totalFilteredItems / itemsPerPage);
    const calculatedTotalPages = newTotalPages > 0 ? newTotalPages : 1;

    // Ensure current page is valid after filtering/sorting
    if (currentPage > calculatedTotalPages) {
      setCurrentPage(calculatedTotalPages);
    } else if (currentPage < 1 && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      paginatedBlogs: filteredBlogs.slice(startIndex, endIndex),
      totalFilteredItems,
      totalPages: calculatedTotalPages,
    };
  }, [
    allBlogsRaw,
    searchQuery,
    filterAuthor,
    filterCategory,
    filterStatus,
    sortKey,
    sortDirection,
    currentPage,
    itemsPerPage,
  ]);

  // Destructure for easier access
  const { paginatedBlogs, totalFilteredItems, totalPages } = processedBlogs;

  // --- Handlers ---
  const handleRefresh = () => {
    // Reset filters and fetch all data again
    setSearchQuery("");
    setFilterAuthor("");
    setFilterCategory("");
    setFilterStatus("all");
    setSortKey("createdAt");
    setSortDirection("desc");
    setCurrentPage(1);
    fetchAllBlogsInitial(); // Re-fetch all raw data
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset pagination on search
  };

  const handleFilterAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterAuthor(e.target.value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleFilterCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterCategory(e.target.value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleFilterStatusChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1); // Reset pagination on filter change
  };

  const handleSort = (key: keyof BlogData) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof BlogData) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // --- CRUD Handlers (remain mostly the same, just removed /v1 from API paths) ---

  const handleOpenCreateDialog = () => {
    setNewBlogTitle("");
    setNewBlogContent("");
    setNewBlogAuthor("");
    setNewBlogCategory("");
    setNewBlogTags("");
    setNewBlogThumbnailUrl("");
    setNewBlogSeoKeywords("");
    setNewBlogReadTime('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    if (!newBlogTitle.trim() || !newBlogContent.trim()) {
      toast.error("Title and Content are required fields.");
      setIsCreating(false);
      return;
    }

    const optionalData: { [key: string]: any } = {};
    if (newBlogAuthor.trim()) optionalData.author = newBlogAuthor.trim();
    if (newBlogCategory.trim()) optionalData.category = newBlogCategory.trim();
    if (newBlogTags.trim()) {
      optionalData.tags = newBlogTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    if (newBlogThumbnailUrl.trim()) optionalData.thumbnailUrl = newBlogThumbnailUrl.trim();
    if (newBlogSeoKeywords.trim()) optionalData.seoKeywords = newBlogSeoKeywords.trim();
    if (typeof newBlogReadTime === 'number') optionalData.readTimeMinutes = newBlogReadTime;

    try {
      const response = await axiosInstance.post("/admin/blog", { // Removed /v1
        data: {
          title: newBlogTitle,
          content: newBlogContent,
          ...optionalData,
        },
      });

      if (response.data.status === "success") {
        toast.success("Blog created successfully!");
        setIsCreateDialogOpen(false);
        fetchAllBlogsInitial(); // Re-fetch all raw blogs after creation
      } else {
        toast.error(response.data.message || "Failed to create blog.");
      }
    } catch (err: any) {
      console.error("Error creating blog:", err);
      setError(err.response?.data?.message || "Error creating blog.");
      toast.error(err.response?.data?.message || "Error creating blog.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenUpdateDialog = (blog: Blog) => {
    setCurrentBlog(blog);
    setUpdatedBlogTitle(blog.data.title);
    setUpdatedBlogContent(blog.data?.content || "");
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);

    if (!currentBlog) return;

    if (!updatedBlogTitle.trim() || !updatedBlogContent.trim()) {
      toast.error("Title and Content cannot be empty.");
      setIsUpdating(false);
      return;
    }

    try {
      const response = await axiosInstance.patch(`/admin/blog/${currentBlog.id}`, { // Removed /v1
        data: {
          title: updatedBlogTitle,
          content: updatedBlogContent,
        },
      });

      if (response.data.status === "success") {
        toast.success("Blog updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllBlogsInitial(); // Re-fetch all raw blogs after update
      } else {
        toast.error(response.data.message || "Failed to update blog.");
      }
    } catch (err: any) {
      console.error("Error updating blog:", err);
      setError(err.response?.data?.message || "Error updating blog.");
      toast.error(err.response?.data?.message || "Error updating blog.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteDialog = (blogId: string) => {
    setBlogToDeleteId(blogId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogToDeleteId) return;

    setIsDeleting(true);
    setError(null);
    try {
      const response = await axiosInstance.delete(`/admin/blog/${blogToDeleteId}`); // Removed /v1

      if (response.data.status === "success") {
        toast.success("Blog deleted successfully!");
        setIsDeleteDialogOpen(false);
        setBlogToDeleteId(null);
        fetchAllBlogsInitial(); // Re-fetch all raw blogs after deletion
      } else {
        toast.error(response.data.message || "Failed to delete blog.");
      }
    } catch (err: any) {
      console.error("Error deleting blog:", err);
      setError(err.response?.data?.message || "Error deleting blog.");
      toast.error(err.response?.data?.message || "Error deleting blog.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <List className="h-8 w-8 text-primary" /> All Blogs
        </h1>
        <Button onClick={handleOpenCreateDialog} className="hover:bg-primary">
          <Plus className="h-5 w-5 mr-2" /> Create New Blog
        </Button>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex flex-col gap-2">
          <Label htmlFor="searchQuery" className="text-sm text-muted-foreground">Search Title/Content</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchQuery"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filterAuthor" className="text-sm text-muted-foreground">Author</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="filterAuthor"
              placeholder="Filter by author..."
              value={filterAuthor}
              onChange={handleFilterAuthorChange}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filterCategory" className="text-sm text-muted-foreground">Category</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="filterCategory"
              placeholder="Filter by category..."
              value={filterCategory}
              onChange={handleFilterCategoryChange}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filterStatus" className="text-sm text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={handleFilterStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          {/* Removed "Apply Filters" button as filters are now reactive */}
          <Button
            variant="outline"
            onClick={handleRefresh} // Repurpose Refresh button to also reset filters
            className="w-full hover:bg-muted flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reset & Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Area - Conditional Rendering */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner className="h-10 w-10 text-primary" />
          <p className="ml-3 text-muted-foreground">Loading blogs...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive-foreground font-medium">{error}</p>
            <Button onClick={fetchAllBlogsInitial} className="mt-4" variant="outline">
              Retry Load
            </Button>
          </CardContent>
        </Card>
      ) : paginatedBlogs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <List className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
                No blogs found
              </h3>
              <p className="text-muted-foreground mb-4">
                Adjust your search or filters, or create a new blog post.
              </p>
              <Button onClick={handleOpenCreateDialog} className="hover:bg-primary">
                <Plus className="h-5 w-5 mr-2" /> Create New Blog
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("title")}
                  >
                    Title {renderSortIcon("title")}
                  </TableHead>
                  <TableHead>Content Snippet</TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("author")}
                  >
                    Author {renderSortIcon("author")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("category")}
                  >
                    Category {renderSortIcon("category")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created At {renderSortIcon("createdAt")}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBlogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {blog.data.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px]">
                      <span dangerouslySetInnerHTML={{ __html: getTextSnippetFromHtml(blog.data.content || '') }} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {blog.data.author || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {blog.data.category || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(blog.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUpdateDialog(blog)}
                          className="hover:bg-primary"
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(blog.id)}
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
      )}

      {/* Pagination Controls */}
      {paginatedBlogs.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages} (Total: {totalFilteredItems})
          </span>
          <Button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Blog Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Blog Post</DialogTitle>
            <DialogDescription>
              Fill in the details for your new blog post. Fields marked with <span className="text-red-500">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBlog} className="grid gap-6 py-4">
            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogTitle" className="md:text-right text-left">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newBlogTitle"
                value={newBlogTitle}
                onChange={(e) => setNewBlogTitle(e.target.value)}
                className="col-span-1 md:col-span-3"
                required
                disabled={isCreating}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-2 md:gap-4">
              <Label htmlFor="newBlogContent" className="md:text-right text-left mt-2">
                Content <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-1 md:col-span-3 h-[400px] flex flex-col border rounded-md overflow-hidden">
                <QuillEditor
                  theme="snow"
                  value={newBlogContent}
                  onChange={setNewBlogContent}
                  className="editor flex-grow bg-card text-card-foreground"
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
                    "header", "bold", "italic", "underline", "strike", "blockquote",
                    "list", "bullet", "indent", "link", "image", "video",
                  ]}
                />
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogAuthor" className="md:text-right text-left">
                Author
              </Label>
              <Input
                id="newBlogAuthor"
                value={newBlogAuthor}
                onChange={(e) => setNewBlogAuthor(e.target.value)}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., Jane Doe"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogCategory" className="md:text-right text-left">
                Category
              </Label>
              <Input
                id="newBlogCategory"
                value={newBlogCategory}
                onChange={(e) => setNewBlogCategory(e.target.value)}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., Technology Trends"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogTags" className="md:text-right text-left">
                Tags (comma-separated)
              </Label>
              <Input
                id="newBlogTags"
                value={newBlogTags}
                onChange={(e) => setNewBlogTags(e.target.value)}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., AI, Future, Blogging"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogThumbnailUrl" className="md:text-right text-left">
                Thumbnail URL
              </Label>
              <Input
                id="newBlogThumbnailUrl"
                value={newBlogThumbnailUrl}
                onChange={(e) => setNewBlogThumbnailUrl(e.target.value)}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., https://example.com/image.jpg"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogSeoKeywords" className="md:text-right text-left">
                SEO Keywords
              </Label>
              <Input
                id="newBlogSeoKeywords"
                value={newBlogSeoKeywords}
                onChange={(e) => setNewBlogSeoKeywords(e.target.value)}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., AI content, writing tools"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="newBlogReadTime" className="md:text-right text-left">
                Read Time (minutes)
              </Label>
              <Input
                id="newBlogReadTime"
                type="number"
                value={newBlogReadTime}
                onChange={(e) => setNewBlogReadTime(e.target.value === '' ? '' : Number(e.target.value))}
                className="col-span-1 md:col-span-3"
                disabled={isCreating}
                placeholder="e.g., 8"
                min="1"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
                className="hover:bg-primary"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="hover:bg-primary">
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
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="updatedBlogTitle" className="md:text-right text-left">
                  Title
                </Label>
                <Input
                  id="updatedBlogTitle"
                  value={updatedBlogTitle}
                  onChange={(e) => setUpdatedBlogTitle(e.target.value)}
                  className="col-span-1 md:col-span-3"
                  required
                  disabled={isUpdating}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-2 md:gap-4">
                <Label htmlFor="updatedBlogContent" className="md:text-right text-left mt-2">
                  Content
                </Label>
                <div className="col-span-1 md:col-span-3 h-[400px] flex flex-col border rounded-md overflow-hidden">
                  <QuillEditor
                    theme="snow"
                    value={updatedBlogContent}
                    onChange={setUpdatedBlogContent}
                    className="editor flex-grow bg-card text-card-foreground"
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
                  onClick={() => setIsUpdateDialogOpen(false)}
                  disabled={isUpdating}
                  className="hover:bg-primary"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating} className="hover:bg-primary">
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
              Are you sure you want to delete this blog post? This action cannot be undone.
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
