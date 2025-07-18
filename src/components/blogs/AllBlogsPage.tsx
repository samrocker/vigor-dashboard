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
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation"; // Import useRouter

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
  image: string | null; // This field still exists at the top level based on the current example, but its value is null.
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
  if (!html) return 'No content';
  if (typeof window === 'undefined') {
    return 'Content not available on server';
  }
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
  const [filterAuthor, setFilterAuthor] = useState("all"); // Changed from "" to "all"
  const [filterCategory, setFilterCategory] = useState("all"); // Changed from "" to "all"
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all"); // New state for status filter
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Blog | keyof BlogData | null>("createdAt"); // Sort by keys within blog.data
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
  const [newBlogStatus, setNewBlogStatus] = useState<string>('draft'); // New state for status
  const [isCreating, setIsCreating] = useState(false);

  // Update Blog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [updatedBlogTitle, setUpdatedBlogTitle] = useState("");
  const [updatedBlogContent, setUpdatedBlogContent] = useState("");
  const [updatedBlogAuthor, setUpdatedBlogAuthor] = useState("");
  const [updatedBlogCategory, setUpdatedBlogCategory] = useState("");
  const [updatedBlogTags, setUpdatedBlogTags] = useState("");
  const [updatedBlogThumbnailUrl, setUpdatedBlogThumbnailUrl] = useState("");
  const [updatedBlogSeoKeywords, setUpdatedBlogSeoKeywords] = useState("");
  const [updatedBlogReadTime, setUpdatedBlogReadTime] = useState<number | string>(''); // Use string for initial empty
  const [updatedBlogStatus, setUpdatedBlogStatus] = useState<string>('draft'); // New state for status
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Blog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [blogToDeleteId, setBlogToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter(); // Initialize useRouter

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
    if (filterAuthor !== "all") { // Changed from .trim() to !== "all"
      const lowerCaseAuthorFilter = filterAuthor.toLowerCase();
      filteredBlogs = filteredBlogs.filter(
        (blog) =>
          blog.data.author && blog.data.author.toLowerCase().includes(lowerCaseAuthorFilter)
      );
    }

    // 3. Apply Category Filter
    if (filterCategory !== "all") { // Changed from .trim() to !== "all"
      const lowerCaseCategoryFilter = filterCategory.toLowerCase();
      filteredBlogs = filteredBlogs.filter(
        (blog) =>
          blog.data.category && blog.data.category.toLowerCase().includes(lowerCaseCategoryFilter)
      );
    }

    // 4. Apply Status Filter
    if (statusFilter !== "all") {
      filteredBlogs = filteredBlogs.filter((blog) => {
        if (statusFilter === "published") {
          return blog.data.status === "published";
        } else if (statusFilter === "draft") {
          return blog.data.status === "draft";
        } else if (statusFilter === "archived") {
          return blog.data.status === "archived";
        }
        return true;
      });
    }

    // 5. Apply Date Filter (by createdAt)
    if (filterStartDate || filterEndDate) {
      filteredBlogs = filteredBlogs.filter(blog => {
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

    // 6. Apply Sorting
    if (sortKey) {
      filteredBlogs.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortKey === 'createdAt' || sortKey === 'updatedAt' || sortKey === 'id') {
          aValue = a[sortKey as keyof Blog];
          bValue = b[sortKey as keyof Blog];
        } else {
          aValue = a.data[sortKey as keyof BlogData];
          bValue = b.data[sortKey as keyof BlogData];
        }

        // Handle null/undefined values for sorting
        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

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
        return 0; // Should not happen if types are consistent
      });
    }

    // 7. Apply Pagination
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

    return {
      paginatedBlogs,
      totalFilteredBlogs: filteredBlogs.length,
      totalPages,
    };
  }, [allBlogsRaw, searchQuery, filterAuthor, filterCategory, statusFilter, filterStartDate, filterEndDate, sortKey, sortDirection, currentPage, itemsPerPage]);

  // Handlers for client-side operations
  const handleRefresh = () => {
    // Re-fetch all blogs if needed, or simply reset filters
    fetchAllBlogsInitial();
    setSearchQuery("");
    setFilterAuthor("all");
    setFilterCategory("all");
    setStatusFilter("all");
    setFilterStartDate(""); // Reset date filter
    setFilterEndDate("");   // Reset date filter
    setCurrentPage(1);
    setSortKey("createdAt");
    setSortDirection("desc");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset page on search
  };

  const handleFilterAuthorChange = (value: string) => {
    setFilterAuthor(value);
    setCurrentPage(1); // Reset page on filter change
  };

  const handleFilterCategoryChange = (value: string) => {
    setFilterCategory(value);
    setCurrentPage(1); // Reset page on filter change
  };

  const handleStatusFilterChange = (value: "all" | "published" | "draft" | "archived") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Blog | keyof BlogData) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc"); // Default to ascending when changing sort key
    }
    setCurrentPage(1); // Reset page on sort
  };

  const renderSortIcon = (key: keyof Blog | keyof BlogData) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
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
  const publishedBlogsCount = allBlogsRaw.filter(blog => blog.data.status === 'published').length;
  const draftBlogsCount = allBlogsRaw.filter(blog => blog.data.status === 'draft').length;
  const archivedBlogsCount = allBlogsRaw.filter(blog => blog.data.status === 'archived').length; // Added archived count


  // --- Create Blog Handlers ---
  const handleOpenCreateDialog = () => {
    setNewBlogTitle("");
    setNewBlogContent("");
    setNewBlogAuthor("");
    setNewBlogCategory("");
    setNewBlogTags("");
    setNewBlogThumbnailUrl("");
    setNewBlogSeoKeywords("");
    setNewBlogReadTime('');
    // Set default status for new blog to 'draft'
    setNewBlogStatus('draft');
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
    optionalData.status = newBlogStatus; // Include newBlogStatus in optionalData

    try {
      // Removed /v1 from the admin blog endpoint
      const response = await axiosInstance.post("/admin/blog", {
        data: { // Ensure the 'data' field is included for the nested structure on creation
          title: newBlogTitle,
          content: newBlogContent,
          ...optionalData,
        },
      });

      if (response.data.status === "success") {
        toast.success("Blog created successfully!");
        setIsCreateDialogOpen(false);
        fetchAllBlogsInitial(); // Re-fetch blogs after creation
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

  // --- Update Blog Handlers ---
  const handleOpenUpdateDialog = (blog: Blog) => {
    setCurrentBlog(blog);
    // Access nested 'data' for current blog values
    setUpdatedBlogTitle(blog.data.title);
    setUpdatedBlogContent(blog.data?.content || "");
    setUpdatedBlogAuthor(blog.data?.author || "");
    setUpdatedBlogCategory(blog.data?.category || "");
    setUpdatedBlogTags(blog.data.tags?.join(', ') || "");
    setUpdatedBlogThumbnailUrl(blog.data?.thumbnailUrl || "");
    setUpdatedBlogSeoKeywords(blog.data?.seoKeywords || "");
    setUpdatedBlogReadTime(blog.data?.readTimeMinutes || "");
    setUpdatedBlogStatus(blog.data?.status || "draft"); // Initialize with existing status or 'draft'
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

    const optionalUpdateData: { [key: string]: any } = {};
    if (updatedBlogAuthor.trim()) optionalUpdateData.author = updatedBlogAuthor.trim();
    if (updatedBlogCategory.trim()) optionalUpdateData.category = updatedBlogCategory.trim();
    if (updatedBlogTags.trim()) {
      optionalUpdateData.tags = updatedBlogTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    if (updatedBlogThumbnailUrl.trim()) optionalUpdateData.thumbnailUrl = updatedBlogThumbnailUrl.trim();
    if (updatedBlogSeoKeywords.trim()) optionalUpdateData.seoKeywords = updatedBlogSeoKeywords.trim();
    if (typeof updatedBlogReadTime === 'number') optionalUpdateData.readTimeMinutes = updatedBlogReadTime;
    optionalUpdateData.status = updatedBlogStatus; // Include updatedBlogStatus

    try {
      // Removed /v1 from the admin blog endpoint
      const response = await axiosInstance.patch(`/admin/blog/${currentBlog.id}`, {
        data: { // Ensure the 'data' field is included for the nested structure on update
          title: updatedBlogTitle,
          content: updatedBlogContent,
          ...optionalUpdateData, // Include optional data in update
        },
      });

      if (response.data.status === "success") {
        toast.success("Blog updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchAllBlogsInitial(); // Re-fetch blogs after update
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

  // --- Delete Blog Handlers ---
  const handleOpenDeleteDialog = (blogId: string) => {
    setBlogToDeleteId(blogId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogToDeleteId) return;

    setIsDeleting(true);
    setError(null);
    try {
      // Removed /v1 from the admin blog endpoint
      const response = await axiosInstance.delete(`/admin/blog/${blogToDeleteId}`);

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
      setError(err.response?.data?.message || "Error deleting blog.");
      toast.error(err.response?.data?.message || "Error deleting blog.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

      <div className="border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full flex items-center justify-between">
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
            <Button onClick={handleOpenCreateDialog} className="hover:bg-primary">
              <Plus className="h-5 w-5 mr-2" /> Create New Blog
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Placeholder for Blog Stats Cards */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Blogs
              </CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{allBlogsRaw.length}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Published Blogs
              </CardTitle>
              <List className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {allBlogsRaw.filter(blog => blog.data.status === 'published').length}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft Blogs
              </CardTitle>
              <List className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {allBlogsRaw.filter(blog => blog.data.status === 'draft').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="mb-8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                id="searchQuery"
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2"
                aria-label="Search blogs"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Select
                  value={filterAuthor}
                  onValueChange={setFilterAuthor} // Assuming setFilterAuthor can take string
                >
                  <SelectTrigger className="pl-10 pr-4 py-2 w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Author" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Authors</SelectItem> {/* Changed value from "" to "all" */}
                    {/* Dynamically populate authors */}
                    {Array.from(new Set(allBlogsRaw.map(blog => blog.data.author).filter(Boolean))).map(author => (
                      <SelectItem key={author} value={author!}>{author}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory} // Assuming setFilterCategory can take string
                >
                  <SelectTrigger className="pl-10 pr-4 py-2 w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem> {/* Changed value from "" to "all" */}
                    {/* Dynamically populate categories */}
                    {Array.from(new Set(allBlogsRaw.map(blog => blog.data.category).filter(Boolean))).map(category => (
                      <SelectItem key={category} value={category!}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="pl-10 pr-4 py-2 w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  id="filterStartDate"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  id="filterEndDate"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
                aria-label="Refresh blog list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="pt-6 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area - Conditional Rendering */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="ml-3 text-muted-foreground">Loading blogs...</p>
          </div>
        ) : (currentBlogsToDisplay?.length ?? 0) === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  No blogs found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first blog post or adjust your filters.
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
                      onClick={() => handleSort('title')}
                    >
                      Title{renderSortIcon('title')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground" 
                      onClick={() => handleSort('author')}
                    >
                      Author{renderSortIcon('author')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground" 
                      onClick={() => handleSort('category')}
                    >
                      Category{renderSortIcon('category')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground" 
                      onClick={() => handleSort('status')}
                    >
                      Status{renderSortIcon('status')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground" 
                      onClick={() => handleSort('createdAt')}
                    >
                      Posted At{renderSortIcon('createdAt')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground" 
                      onClick={() => handleSort('updatedAt')}
                    >
                      Last Edited At{renderSortIcon('updatedAt')}
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
                        {blog.data.author || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {blog.data.category || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            blog.data.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-orange-100 text-orange-800 hover:bg-orange-100'
                          }`}
                        >
                          {blog.data.status || 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(blog.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(blog.updatedAt)}
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
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/blog/${blog.id}`)}
                            className="hover:bg-primary"
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
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

        {/* Pagination */}
        {totalPagesDisplay > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
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
          </div>
        )}
      </div>

      {/* --- Dialogs --- */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="newBlogAuthor" className="text-left">Author</Label>
                <Input
                  id="newBlogAuthor"
                  value={newBlogAuthor}
                  onChange={(e) => setNewBlogAuthor(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newBlogCategory" className="text-left">Category</Label>
                <Input
                  id="newBlogCategory"
                  value={newBlogCategory}
                  onChange={(e) => setNewBlogCategory(e.target.value)}
                  placeholder="e.g., Technology Trends"
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newBlogTags" className="text-left">Tags (comma-separated)</Label>
                <Input
                  id="newBlogTags"
                  value={newBlogTags}
                  onChange={(e) => setNewBlogTags(e.target.value)}
                  placeholder="e.g., AI, Future, Blogging"
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newBlogThumbnailUrl" className="text-left">Thumbnail URL</Label>
                <Input
                  id="newBlogThumbnailUrl"
                  value={newBlogThumbnailUrl}
                  onChange={(e) => setNewBlogThumbnailUrl(e.target.value)}
                  placeholder="e.g., https://example.com/image.jpg"
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newBlogSeoKeywords" className="text-left">SEO Keywords</Label>
                <Input
                  id="newBlogSeoKeywords"
                  value={newBlogSeoKeywords}
                  onChange={(e) => setNewBlogSeoKeywords(e.target.value)}
                  placeholder="e.g., AI content, writing tools"
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newBlogReadTime" className="text-left">Read Time (minutes)</Label>
                <Input
                  id="newBlogReadTime"
                  type="number"
                  value={newBlogReadTime}
                  onChange={(e) => setNewBlogReadTime(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g., 8"
                  min="1"
                  disabled={isCreating}
                />
              </div>
              {/* New field for Status */}
              <div className="grid gap-2">
                <Label htmlFor="newBlogStatus" className="text-left">Status</Label>
                <Select
                  value={newBlogStatus}
                  onValueChange={setNewBlogStatus}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              {/* Optional Fields for Update Dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogAuthor" className="text-left">Author</Label>
                  <Input
                    id="updatedBlogAuthor"
                    value={updatedBlogAuthor}
                    onChange={(e) => setUpdatedBlogAuthor(e.target.value)}
                    placeholder="e.g., Jane Doe"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogCategory" className="text-left">Category</Label>
                  <Input
                    id="updatedBlogCategory"
                    value={updatedBlogCategory}
                    onChange={(e) => setUpdatedBlogCategory(e.target.value)}
                    placeholder="e.g., Technology Trends"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogTags" className="text-left">Tags (comma-separated)</Label>
                  <Input
                    id="updatedBlogTags"
                    value={updatedBlogTags}
                    onChange={(e) => setUpdatedBlogTags(e.target.value)}
                    placeholder="e.g., AI, Future, Blogging"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogThumbnailUrl" className="text-left">Thumbnail URL</Label>
                  <Input
                    id="updatedBlogThumbnailUrl"
                    value={updatedBlogThumbnailUrl}
                    onChange={(e) => setUpdatedBlogThumbnailUrl(e.target.value)}
                    placeholder="e.g., https://example.com/image.jpg"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogSeoKeywords" className="text-left">SEO Keywords</Label>
                  <Input
                    id="updatedBlogSeoKeywords"
                    value={updatedBlogSeoKeywords}
                    onChange={(e) => setUpdatedBlogSeoKeywords(e.target.value)}
                    placeholder="e.g., AI content, writing tools"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogReadTime" className="text-left">Read Time (minutes)</Label>
                  <Input
                    id="updatedBlogReadTime"
                    type="number"
                    value={updatedBlogReadTime}
                    onChange={(e) => setUpdatedBlogReadTime(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 8"
                    min="1"
                    disabled={isUpdating}
                  />
                </div>
                {/* New field for Status in Update Dialog */}
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogStatus" className="text-left">Status</Label>
                  <Select
                    value={updatedBlogStatus}
                    onValueChange={setUpdatedBlogStatus}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
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
