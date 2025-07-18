// src/app/blog/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  LayoutGrid,
  Clock,
  List,
  XCircle,
  Edit,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import Link from "next/link";
import DOMPurify from "dompurify"; // For sanitizing HTML content
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuillEditor from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Save } from "lucide-react";

// --- Type Definitions ---
interface BlogData {
  title: string;
  content: string;
  author?: string;
  tags?: string[];
  category?: string;
  status?: string;
  seoKeywords?: string;
  readTimeMinutes?: number;
  thumbnailUrl?: string | null; // Re-adding thumbnailUrl
  [key: string]: any;
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
  image: Image | null; // Updated to match the new API response
}

interface SingleBlogApiResponse {
  data: {
    blog: Blog;
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
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    console.error("Invalid date string for formatting:", dateString, e);
    return "Invalid Date";
  }
}

function getTextSnippetFromHtml(html: string, maxLength: number = 100): string {
  if (!html) return "No content";
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

const BlogDetailPage = () => {
  const params = useParams();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update Blog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updatedBlogTitle, setUpdatedBlogTitle] = useState("");
  const [updatedBlogContent, setUpdatedBlogContent] = useState("");
  const [updatedBlogAuthor, setUpdatedBlogAuthor] = useState("");
  const [updatedBlogCategory, setUpdatedBlogCategory] = useState("");
  const [updatedBlogTags, setUpdatedBlogTags] = useState("");
  const [updatedBlogSeoKeywords, setUpdatedBlogSeoKeywords] = useState("");
  const [updatedBlogReadTime, setUpdatedBlogReadTime] = useState<
    number | string
  >("");
  const [updatedBlogStatus, setUpdatedBlogStatus] = useState<string>("draft");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Blog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New state for file upload
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [updatedBlogThumbnailUrl, setUpdatedBlogThumbnailUrl] = useState("");

  const fetchBlogDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<SingleBlogApiResponse>(
        `public/blog/${blogId}?includeRelations=true`
      );

      if (response.data.status === "success" && response.data.data?.blog) {
        setBlog(response.data.data.blog);
      } else {
        setError(response.data.message || "Failed to fetch blog details.");
        setBlog(null);
      }
    } catch (err: any) {
      console.error("Error fetching blog details:", err);
      setError(
        err.response?.data?.message ||
          "An unexpected error occurred while fetching blog details."
      );
      setBlog(null);
      toast.error("Failed to load blog details.");
    } finally {
      setLoading(false);
    }
  }, [blogId]); // Depend on blogId so it refetches if ID changes


  useEffect(() => {
    if (blogId) {
      fetchBlogDetails();
    } else {
      setLoading(false);
      setError("No blog ID provided.");
    }
  }, [blogId, fetchBlogDetails]);


  // Sanitize content before rendering
  const sanitizedContent = blog?.data.content
    ? DOMPurify.sanitize(blog.data.content)
    : "";

  // --- Update Blog Handlers ---
  const handleOpenUpdateDialog = () => {
    if (!blog) return; // Should not happen if button is conditionally rendered
    setUpdatedBlogTitle(blog.data.title);
    setUpdatedBlogContent(blog.data?.content || "");
    setUpdatedBlogAuthor(blog.data?.author || "");
    setUpdatedBlogCategory(blog.data?.category || "");
    setUpdatedBlogTags(blog.data.tags?.join(", ") || "");
    setUpdatedBlogSeoKeywords(blog.data?.seoKeywords || "");
    setUpdatedBlogReadTime(blog.data?.readTimeMinutes || "");
    setUpdatedBlogStatus(blog.data?.status || "draft");
    setIsUpdateDialogOpen(true);
    setSelectedThumbnailFile(null); // Clear any previously selected file
    setUpdatedBlogThumbnailUrl(blog.data.thumbnailUrl || "");
  };

  const handleUpdateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);

    if (!blog) return;

    if (!updatedBlogTitle.trim() || !updatedBlogContent.trim()) {
      toast.error("Title and Content cannot be empty.");
      setIsUpdating(false);
      return;
    }

    const optionalUpdateData: { [key: string]: any } = {};
    if (updatedBlogAuthor.trim())
      optionalUpdateData.author = updatedBlogAuthor.trim();
    if (updatedBlogCategory.trim())
      optionalUpdateData.category = updatedBlogCategory.trim();
    if (updatedBlogTags.trim()) {
      optionalUpdateData.tags = updatedBlogTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    }
    // Re-adding thumbnail URL logic
    if (updatedBlogThumbnailUrl.trim()) {
      optionalUpdateData.thumbnailUrl = updatedBlogThumbnailUrl.trim();
    } else if (blog.data.thumbnailUrl) {
      // If the URL was cleared, explicitly set to null to remove existing thumbnail
      optionalUpdateData.thumbnailUrl = null;
    }

    if (updatedBlogSeoKeywords.trim())
      optionalUpdateData.seoKeywords = updatedBlogSeoKeywords.trim();
    if (typeof updatedBlogReadTime === "number")
      optionalUpdateData.readTimeMinutes = updatedBlogReadTime;
    optionalUpdateData.status = updatedBlogStatus;

    try {
      let finalBlogData: BlogData = {
        ...optionalUpdateData,
        title: updatedBlogTitle,
        content: updatedBlogContent,
      };

      // Handle thumbnail file upload separately if a new file is selected
      if (selectedThumbnailFile) {
        const formData = new FormData();
        formData.append("image", selectedThumbnailFile);
        // Explicitly set blogId to associate the image with this blog
        formData.append("blogId", blog.id);

        const imageUploadResponse = await axiosInstance.post("/admin/image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (
          imageUploadResponse.data.status === "success" &&
          imageUploadResponse.data.data?.image?.url
        ) {
          finalBlogData.thumbnailUrl = imageUploadResponse.data.data.image.url;
        } else {
          toast.error("Failed to upload new thumbnail image.");
          setIsUpdating(false);
          return; // Stop update if image upload fails
        }
      } else if (updatedBlogThumbnailUrl === "" && blog.data.thumbnailUrl) {
        // If updatedBlogThumbnailUrl is explicitly cleared by user, set to null
        finalBlogData.thumbnailUrl = null;
      }

      const response = await axiosInstance.patch(`/admin/blog/${blog.id}`, {
        data: finalBlogData,
      });

      if (response.data.status === "success") {
        toast.success("Blog updated successfully!");
        setIsUpdateDialogOpen(false);
        setSelectedThumbnailFile(null); // Clear selected file after successful upload/update
        fetchBlogDetails(); // Re-fetch blog details after update
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
  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogId) return; // Should not happen as blogId is from params

    setIsDeleting(true);
    setError(null);
    try {
      const response = await axiosInstance.delete(`/admin/blog/${blogId}`);

      if (response.data.status === "success") {
        toast.success("Blog deleted successfully!");
        setIsDeleteDialogOpen(false);
        // Redirect to all blogs page after successful deletion
        window.location.href = "/blog";
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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex flex-col items-center">
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

      <div className="w-full max-w-4xl mb-6 flex justify-between items-center">
        <Link href="/blog" passHref>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to All Blogs
          </Button>
        </Link>
        {/* Potentially add social share buttons or other actions here */}
        <div className="flex items-center gap-2">
          {blog && (
            <Button
              onClick={handleOpenUpdateDialog}
              variant="outline"
              className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground"
            >
              <Edit className="h-4 w-4" /> Edit Blog
            </Button>
          )}
          {blog && (
            <Button
              onClick={handleOpenDeleteDialog}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete Blog
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <LoadingSpinner className="h-10 w-10 text-primary" />
          <p className="ml-3 text-muted-foreground">Loading blog details...</p>
        </div>
      ) : error ? (
        <Card className="w-full max-w-4xl border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive-foreground font-medium">{error}</p>
            <Button
              onClick={fetchBlogDetails}
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !blog ? (
        <Card className="w-full max-w-4xl border-border">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <List className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
                Blog post not found
              </h3>
              <p className="text-muted-foreground mb-4">
                The blog post you are looking for does not exist or has been
                removed.
              </p>
              <Link href="/blog" passHref>
                <Button className="hover:bg-primary">
                  <ArrowLeft className="h-5 w-5 mr-2" /> Go to All Blogs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-4xl shadow-lg p-6">
          {blog.image && (
            <div className="mb-6">
              <img
                src={blog.image.url}
                alt={blog.data.title || "Blog thumbnail"}
                className="w-full h-64 object-cover rounded-lg shadow-md"
              />
            </div>
          )}

          <CardHeader className="px-0 pt-0 pb-4">
            <CardTitle className="text-4xl font-extrabold text-foreground mb-2 leading-tight">
              {blog.data.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {blog.data.author && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4 text-primary" /> {blog.data.author}
                  </span>
                )}
                {blog.data.category && (
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="h-4 w-4 text-primary" />{" "}
                    {blog.data.category}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-primary" />{" "}
                  {formatDate(blog.createdAt)}
                </span>
                {blog.data.readTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-primary" />{" "}
                    {blog.data.readTimeMinutes} min read
                  </span>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 py-4 border-t border-b border-border">
            <div
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>

          {blog.data.tags && blog.data.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Tag className="h-4 w-4 text-primary" /> Tags:
              </span>
              {blog.data.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 text-sm text-muted-foreground text-center">
            Last updated: {formatDate(blog.updatedAt)}
          </div>
        </Card>
      )}

      {/* --- Dialogs --- */}
      {/* Update Blog Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Make changes to the blog post here.
            </DialogDescription>
          </DialogHeader>
          {blog && (
            <form onSubmit={handleUpdateBlog} className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label
                  htmlFor="updatedBlogTitle"
                  className="md:text-right text-left"
                >
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
                <Label
                  htmlFor="updatedBlogContent"
                  className="md:text-right text-left mt-2"
                >
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
                  <Label htmlFor="updatedBlogAuthor" className="text-left">
                    Author
                  </Label>
                  <Input
                    id="updatedBlogAuthor"
                    value={updatedBlogAuthor}
                    onChange={(e) => setUpdatedBlogAuthor(e.target.value)}
                    placeholder="e.g., Jane Doe"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogCategory" className="text-left">
                    Category
                  </Label>
                  <Input
                    id="updatedBlogCategory"
                    value={updatedBlogCategory}
                    onChange={(e) => setUpdatedBlogCategory(e.target.value)}
                    placeholder="e.g., Technology Trends"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogTags" className="text-left">
                    Tags (comma-separated)
                  </Label>
                  <Input
                    id="updatedBlogTags"
                    value={updatedBlogTags}
                    onChange={(e) => setUpdatedBlogTags(e.target.value)}
                    placeholder="e.g., AI, Future, Blogging"
                    disabled={isUpdating}
                  />
                </div>
                {/* Re-adding Thumbnail URL field */}
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
                  <Label htmlFor="updatedBlogSeoKeywords" className="text-left">
                    SEO Keywords
                  </Label>
                  <Input
                    id="updatedBlogSeoKeywords"
                    value={updatedBlogSeoKeywords}
                    onChange={(e) => setUpdatedBlogSeoKeywords(e.target.value)}
                    placeholder="e.g., AI content, writing tools"
                    disabled={isUpdating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogReadTime" className="text-left">
                    Read Time (minutes)
                  </Label>
                  <Input
                    id="updatedBlogReadTime"
                    type="number"
                    value={updatedBlogReadTime}
                    onChange={(e) =>
                      setUpdatedBlogReadTime(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="e.g., 8"
                    min="1"
                    disabled={isUpdating}
                  />
                </div>
                {/* New field for Status in Update Dialog */}
                <div className="grid gap-2">
                  <Label htmlFor="updatedBlogStatus" className="text-left">
                    Status
                  </Label>
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

               {/* Thumbnail URL selection */}
              <div className="grid gap-2 col-span-full">
                <Label htmlFor="updatedBlogThumbnailUrl" className="text-left">Thumbnail Image</Label>
                <div className="flex items-center space-x-2">
                  {(updatedBlogThumbnailUrl || selectedThumbnailFile) ? (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden border border-border flex-shrink-0">
                      <img
                        src={selectedThumbnailFile ? URL.createObjectURL(selectedThumbnailFile) : updatedBlogThumbnailUrl}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 p-1 h-auto w-auto text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setUpdatedBlogThumbnailUrl("");
                          setSelectedThumbnailFile(null);
                        }}
                        disabled={isUpdating}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-md border border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground text-sm flex-shrink-0">
                      No Image
                    </div>
                  )}
                  <Input
                    id="thumbnailFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedThumbnailFile(e.target.files[0]);
                        setUpdatedBlogThumbnailUrl(URL.createObjectURL(e.target.files[0])); // Show preview
                      } else {
                        setSelectedThumbnailFile(null);
                        setUpdatedBlogThumbnailUrl("");
                      }
                    }}
                    className="flex-grow"
                    disabled={isUpdating}
                  />
                </div>
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
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="hover:bg-primary"
                >
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

export default BlogDetailPage;