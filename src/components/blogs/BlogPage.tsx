// src/app/blog/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  List,
  XCircle,
  Edit,
  Trash2,
  Save,
  ImageIcon,
  UploadCloud,
  RefreshCw,
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import Link from "next/link";
import DOMPurify from "dompurify";
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
import QuillEditor from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Type Definitions ---
interface BlogData {
  title: string;
  content: string;
  thumbnailUrl?: string | null;
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
  image: Image | null;
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

const BlogDetailPage = () => {
  const params = useParams();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update Blog Content Dialog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updatedBlogTitle, setUpdatedBlogTitle] = useState("");
  const [updatedBlogContent, setUpdatedBlogContent] = useState("");
  const [isUpdatingMainContent, setIsUpdatingMainContent] = useState(false);

  // Delete Blog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Thumbnail states
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isRemovingThumbnail, setIsRemovingThumbnail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBlogDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<SingleBlogApiResponse>(
        `public/blog/${blogId}?includeRelations=true`
      );

      if (response.data.status === "success" && response.data.data?.blog) {
        setBlog(response.data.data.blog);
        setSelectedThumbnailFile(null); // Reset selected file after successful fetch
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
  }, [blogId]);

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

  // --- Update Blog Content Handlers (for the dialog) ---
  const handleOpenUpdateDialog = () => {
    if (!blog) return;
    setUpdatedBlogTitle(blog.data.title);
    setUpdatedBlogContent(blog.data?.content || "");
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateBlogContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingMainContent(true);
    setError(null);

    if (!blog) return;

    if (!updatedBlogTitle.trim() || !updatedBlogContent.trim()) {
      toast.error("Title and Content cannot be empty.");
      setIsUpdatingMainContent(false);
      return;
    }

    const updatedData: Partial<BlogData> = {
      title: updatedBlogTitle,
      content: updatedBlogContent,
    };

    try {
      const response = await axiosInstance.patch(`/admin/blog/${blog.id}`, {
        data: updatedData,
      });

      if (response.data.status === "success") {
        toast.success("Blog content updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchBlogDetails();
      } else {
        toast.error(response.data.message || "Failed to update blog content.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error updating blog content.");
      console.error("Update blog content error:", err);
    } finally {
      setIsUpdatingMainContent(false);
    }
  };

  // --- Thumbnail Management Handlers ---

  // Function to handle the actual upload logic
  const uploadThumbnail = async (file: File) => {
    if (!blog) {
      toast.error("Blog data not available for upload.");
      return;
    }

    setIsUploadingThumbnail(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("blogId", blog.id);

    try {
      // If an old image exists for this blog, delete it first
      if (blog.image?.id) {
        try {
          await axiosInstance.delete(`/admin/image/${blog.image.id}`);
          toast.info("Old thumbnail removed, uploading new one...");
        } catch (deleteError) {
          console.error("Failed to delete old thumbnail:", deleteError);
          toast.warning("Could not remove old thumbnail. Proceeding with upload.");
        }
      }

      const response = await axiosInstance.post("/admin/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        toast.success("Thumbnail uploaded successfully!");
        setSelectedThumbnailFile(null); // Clear selected file after successful upload
        fetchBlogDetails(); // Re-fetch blog details to update UI with new image
      } else {
        toast.error(response.data.message || "Failed to upload thumbnail.");
      }
    } catch (err: any) {
      if (err.response && err.response.status === 413) {
        toast.error("Thumbnail image too large. Please upload an image smaller than 5MB.");
      } else {
        toast.error(err.response?.data?.message || "Error uploading thumbnail.");
      }
      console.error("Upload thumbnail error:", err);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  // This handler now directly triggers the upload
  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedThumbnailFile(file); // Set for preview immediately
      uploadThumbnail(file); // Trigger upload immediately
    } else {
      setSelectedThumbnailFile(null);
    }
  };

  const handleRemoveThumbnail = async () => {
    if (!blog?.image?.id) {
        // If there's no actual uploaded image but a selected file, just clear the selected file.
        if (selectedThumbnailFile) {
            setSelectedThumbnailFile(null);
            toast.info("Selected thumbnail preview cleared.");
        }
        return;
    }

    setIsRemovingThumbnail(true);
    try {
      const response = await axiosInstance.delete(`/admin/image/${blog.image.id}`);
      if (response.data.status === "success") {
        toast.success("Thumbnail image removed successfully!");
        fetchBlogDetails(); // Re-fetch blog details to reflect removal
      } else {
        toast.error(response.data.message || "Failed to remove thumbnail image.");
      }
    } catch (err: any) {
      console.error("Error removing thumbnail:", err);
      toast.error(err.response?.data?.message || "Error removing thumbnail image.");
    } finally {
      setIsRemovingThumbnail(false);
    }
  };

  const isAnyActionInProgress = loading || isUpdatingMainContent || isUploadingThumbnail || isRemovingThumbnail || isDeleting;


  // --- Delete Blog Handlers ---
  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogId) return;

    setIsDeleting(true);
    setError(null);
    try {
      const response = await axiosInstance.delete(`/admin/blog/${blogId}`);

      if (response.data.status === "success") {
        toast.success("Blog deleted successfully!");
        setIsDeleteDialogOpen(false);
        window.location.href = "/blog"; // Redirect after successful deletion
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

  const currentDisplayedImageUrl = selectedThumbnailFile ? URL.createObjectURL(selectedThumbnailFile) : blog?.image?.url;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl mb-6 flex justify-between items-center"
      >
        <Link href="/blog" passHref>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" /> Back to All Blogs
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            blog && (
              <Button
                onClick={handleOpenUpdateDialog}
                variant="outline"
                className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground"
                disabled={isAnyActionInProgress}
              >
                <Edit className="h-4 w-4" /> Edit Content
              </Button>
            )
          )}
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            blog && (
              <Button
                onClick={handleOpenDeleteDialog}
                variant="destructive"
                className="flex items-center gap-2"
                disabled={isAnyActionInProgress}
              >
                <Trash2 className="h-4 w-4" /> Delete Blog
              </Button>
            )
          )}
        </div>
      </motion.div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-4xl shadow-lg p-6 mx-auto"
        >
          <div className="mb-6">
            <Skeleton className="w-full h-64 rounded-lg" />
          </div>
          <div className="px-0 pt-0 pb-4">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="px-0 py-4 border-t border-b border-border">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-8 text-sm text-muted-foreground text-center">
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
        </motion.div>
      ) : error && !blog ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-4xl border-destructive bg-destructive/10 p-6 rounded-lg mx-auto"
        >
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
        </motion.div>
      ) : !blog ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-4xl border-border p-6 rounded-lg mx-auto"
        >
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
        </motion.div>
      ) : (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="w-full max-w-4xl shadow-lg p-6 rounded-lg bg-card text-card-foreground mx-auto"
        >
            <div className="mb-6 relative group">
              {currentDisplayedImageUrl ? (
                <img
                  src={currentDisplayedImageUrl}
                  alt={blog.data.title || "Blog thumbnail"}
                  className="w-full h-[500px] object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center rounded-lg bg-muted border border-dashed border-muted-foreground/50">
                  <ImageIcon className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}

              {/* Overlay for image actions */}
              <div
                className={`absolute inset-0 bg-black bg-opacity-60 rounded-lg
                  flex flex-col items-center justify-center text-white
                  ${isAnyActionInProgress ? 'opacity-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'}
                  transition-opacity duration-300`}
              >
                {/* Display spinner or message if any image action is in progress */}
                {isUploadingThumbnail || isRemovingThumbnail ? (
                  <div className="flex flex-col items-center">
                    <LoadingSpinner className="h-8 w-8 text-white" />
                    <p className="mt-2 text-sm">{isUploadingThumbnail ? "Uploading..." : "Removing..."}</p>
                  </div>
                ) : (
                  <>
                    <Label
                      htmlFor="mainThumbnailFileInput"
                      className="cursor-pointer bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-md text-sm font-medium transition-colors mb-2"
                    >
                      <UploadCloud className="h-4 w-4 inline mr-2" /> Change Thumbnail
                      <Input
                        id="mainThumbnailFileInput"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange} // This now directly triggers upload
                        className="hidden"
                        disabled={isAnyActionInProgress}
                        ref={fileInputRef}
                        // Important: Clear the input value after selection to allow re-uploading the same file
                        // or to ensure onChange fires even if the same file is picked after cancellation.
                        onClick={(e) => { e.currentTarget.value = ''; }}
                      />
                    </Label>

                    {/* The "Save New Thumbnail" button is removed */}

                    {blog.image?.id && ( // Only show remove button if there's an actual image on the server
                      <Button
                        variant="destructive"
                        onClick={handleRemoveThumbnail}
                        disabled={isAnyActionInProgress}
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 inline mr-2" /> Remove Current Thumbnail
                      </Button>
                    )}

                    {/* The "Clear Selection" button is still useful if a user picks a file then changes their mind BEFORE upload finishes */}
                    {selectedThumbnailFile && !blog.image?.id && (
                        <Button
                            variant="outline"
                            onClick={() => setSelectedThumbnailFile(null)}
                            disabled={isAnyActionInProgress}
                            size="sm"
                            className="mt-2 bg-transparent text-white hover:bg-white/20"
                        >
                            <XCircle className="h-4 w-4 mr-2" /> Clear Selection
                        </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-4xl font-extrabold text-foreground mb-2 leading-tight">
                {blog.data.title}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-primary" />{" "}
                    {formatDate(blog.createdAt)}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-4 border-t border-b border-border">
              <div
                className="prose prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </CardContent>

            <div className="mt-8 text-sm text-muted-foreground text-center">
              Last updated: {formatDate(blog.updatedAt)}
            </div>
        </motion.div>
      )}

      {/* --- Dialogs --- */}
      {blog && (
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Blog Post Content</DialogTitle>
              <DialogDescription>
                Make changes to the blog post's title and main content here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateBlogContent} className="grid gap-6 py-4">
              <div className="grid grid-cols-1 items-center gap-2">
                <Label
                  htmlFor="updatedBlogTitle"
                  className="text-left text-sm font-medium"
                >
                  Title
                </Label>
                <Input
                  id="updatedBlogTitle"
                  value={updatedBlogTitle}
                  onChange={(e) => setUpdatedBlogTitle(e.target.value)}
                  required
                  disabled={isUpdatingMainContent}
                  placeholder="Enter blog title"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label
                  htmlFor="updatedBlogContent"
                  className="text-left text-sm font-medium"
                >
                  Content
                </Label>
                <div className="h-[400px] flex flex-col border rounded-md overflow-hidden">
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

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                  disabled={isUpdatingMainContent}
                  className="hover:bg-primary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingMainContent}
                  className="hover:bg-primary"
                >
                  {isUpdatingMainContent ? (
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
          </DialogContent>
        </Dialog>
      )}

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