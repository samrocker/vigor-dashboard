// app/admin/images/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiResponse, axiosInstance } from "@/lib/axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table, // Not used in this specific component, but often kept in template
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ImageIcon, // Main image icon
  Info, // General info
  Calendar, // Dates
  ArrowLeft, // Back button
  CheckCircle, // For true boolean status
  XCircle, // For false boolean status
  Package, // For product
  FolderOpen, // For category/subcategory
  BookText, // For blog (assuming this icon fits)
  Eye,
  HardDrive, // For view details buttons
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Type Definitions ---
interface ProductDetailsForImage {
  id: string;
  name: string; // Already available from includeRelations=true
  description: string | null;
  price: number;
  // ... any other relevant product fields
}

interface CategoryDetailsForImage {
  id: string;
  name: string; // Already available from includeRelations=true
  description: string | null;
  // ... any other relevant category fields
}

interface SubCategoryDetailsForImage {
  id: string;
  name: string; // Already available from includeRelations=true
  description: string | null;
  // ... any other relevant subCategory fields
}

// New interface for the blog data returned by includeRelations
interface BlogSummaryForImage {
  id: string;
  title: string;
}

// Interface for detailed blog information fetched via getById API
interface BlogDetailedForImage {
  id: string;
  title: string;
  author?: string;
  content?: string;
}

// New interface to represent the nested structure of the blog object directly from the API response
interface BlogApiResponseNestedData {
  id: string;
  data: {
    author: string;
    category: string;
    tags: string[];
    thumbnailUrl: string;
    seoKeywords: string;
    readTimeMinutes: number;
    status: string;
    title: string;
    content: string;
  };
  createdAt: string;
  updatedAt: string;
}

// This interface accurately reflects the structure of the API response for /public/blog/:id
interface BlogDetailsApiResponse extends ApiResponse {
  data: {
    blog: BlogApiResponseNestedData; // Use the new nested interface here
  };
}

interface ImageDetails {
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
  // Relations (included when includeRelations=true, as per your API example)
  product?: ProductDetailsForImage;
  category?: CategoryDetailsForImage;
  subCategory?: SubCategoryDetailsForImage;
  blog?: BlogSummaryForImage; // This reflects the initial `includeRelations=true` response
}

interface ImageDetailsApiResponse extends ApiResponse {
  data: {
    image: ImageDetails;
  };
}

interface ProductDetailsApiResponse extends ApiResponse {
  data: {
    product: ProductDetailsForImage;
  };
}

interface CategoryDetailsApiResponse extends ApiResponse {
  data: {
    category: CategoryDetailsForImage;
  };
}

interface SubCategoryDetailsApiResponse extends ApiResponse {
  data: {
    subCategory: SubCategoryDetailsForImage;
  };
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

const ImageDetailsPage = () => {
  const params = useParams();
  const imageId = params.id as string;
  const router = useRouter();

  const [image, setImage] = useState<ImageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [associatedProductDetails, setAssociatedProductDetails] = useState<ProductDetailsForImage | null>(null);
  const [associatedCategoryDetails, setAssociatedCategoryDetails] = useState<CategoryDetailsForImage | null>(null);
  const [associatedSubCategoryDetails, setAssociatedSubCategoryDetails] = useState<SubCategoryDetailsForImage | null>(null);
  const [associatedBlogDetails, setAssociatedBlogDetails] = useState<BlogDetailedForImage | null>(null); // Use BlogDetailedForImage
  const [fetchingAssociatedDetails, setFetchingAssociatedDetails] = useState(false);

  useEffect(() => {
    if (imageId) {
      fetchImageDetails(imageId);
    }
  }, [imageId]);

  const fetchImageDetails = async (id: string) => {
    setLoading(true);
    try {
      // API call to get image details including relations
      const response = await axiosInstance.get<ImageDetailsApiResponse>(
        `/public/image/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.image) {
        // Map the blog data received from includeRelations to BlogSummaryForImage for consistency
        const imageWithMappedBlog = {
          ...response.data.data.image,
          blog: response.data.data.image.blog ? { 
            id: response.data.data.image.blog.id,
            title: response.data.data.image.blog.title
          } : undefined
        };

        setImage(imageWithMappedBlog);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch image details.");
        setImage(null);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "An unexpected error occurred while fetching image details."
      );
      setImage(null);
      toast.error("Failed to load image details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchRelatedEntityDetails = async () => {
      if (!image) return;

      setFetchingAssociatedDetails(true);
      try {
        if (image.productId) {
          const response = await axiosInstance.get<ProductDetailsApiResponse>(`/public/product/${image.productId}`);
          if (response.data.status === "success" && response.data.data?.product) {
            setAssociatedProductDetails(response.data.data.product);
          } else {
            setAssociatedProductDetails(null);
          }
        } else {
          setAssociatedProductDetails(null);
        }

        if (image.categoryId) {
          const response = await axiosInstance.get<CategoryDetailsApiResponse>(`/public/category/${image.categoryId}`);
          if (response.data.status === "success" && response.data.data?.category) {
            setAssociatedCategoryDetails(response.data.data.category);
          } else {
            setAssociatedCategoryDetails(null);
          }
        } else {
          setAssociatedCategoryDetails(null);
        }

        if (image.subCategoryId) {
          const response = await axiosInstance.get<SubCategoryDetailsApiResponse>(`/public/sub-category/${image.subCategoryId}`);
          if (response.data.status === "success" && response.data.data?.subCategory) {
            setAssociatedSubCategoryDetails(response.data.data.subCategory);
          } else {
            setAssociatedSubCategoryDetails(null);
          }
        } else {
          setAssociatedSubCategoryDetails(null);
        }

        if (image.blogId) {
          const response = await axiosInstance.get<BlogDetailsApiResponse>(`/public/blog/${image.blogId}`);
          if (response.data.status === "success" && response.data.data?.blog) {
            setAssociatedBlogDetails({
              id: response.data.data.blog.id,
              title: response.data.data.blog.data.title,
              author: response.data.data.blog.data.author,
              content: response.data.data.blog.data.content,
            });
          } else {
            setAssociatedBlogDetails(null);
          }
        } else {
          setAssociatedBlogDetails(null);
        }

      } catch (err) {
        console.error("Error fetching associated entity details:", err);
        toast.error("Could not fetch full details for associated entity.");
        setAssociatedProductDetails(null);
        setAssociatedCategoryDetails(null);
        setAssociatedSubCategoryDetails(null);
        setAssociatedBlogDetails(null);
      } finally {
        setFetchingAssociatedDetails(false);
      }
    };

    fetchRelatedEntityDetails();
  }, [image]);

  // --- Navigation Handlers for Associated Entities ---
  // These handlers are ready to navigate to the specific entity's details page.
  // The 'name' property is already available on the 'image.product', 'image.category' etc.
  // if 'includeRelations=true' fetches them, as per your sample API response.
  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewCategoryDetails = (categoryId: string) => {
    router.push(`/categorie/${categoryId}`);
  };

  const handleViewSubCategoryDetails = (subCategoryId: string) => {
    router.push(`/subcategory/${subCategoryId}`);
  };

  const handleViewBlogDetails = (blogId: string) => {
    // Assuming a blog details page path, e.g., /blogs/:id
    router.push(`/blog/${blogId}`);
  };

  // --- Render Loading/Error/Not Found States ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading image details...</p>
      </div>
    );
  }

  if (error && !image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
              <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Image not found.</p>
              <Button onClick={() => router.back()} className="mt-4 hover:bg-primary" variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine the associated entity type for display,
  // extracting the name property directly from the nested object.
  const associatedEntity = (() => {
    if (!image) return null;

    interface AssociatedEntityInfo {
      type: string;
      id: string;
      name: string;
      icon: JSX.Element;
      handler: (id: string) => void;
      details?: ProductDetailsForImage | CategoryDetailsForImage | SubCategoryDetailsForImage | BlogDetailedForImage; // Use BlogDetailedForImage
    }

    if (image.productId) {
      const productData = associatedProductDetails || image.product;
      return {
        type: "Product",
        id: image.productId,
        name: productData?.name || "Unknown Product",
        icon: <Package className="h-4 w-4 mr-1 text-muted-foreground" />,
        handler: handleViewProductDetails,
        details: productData,
      } as AssociatedEntityInfo;
    }
    if (image.categoryId) {
      const categoryData = associatedCategoryDetails || image.category;
      return {
        type: "Category",
        id: image.categoryId,
        name: categoryData?.name || "Unknown Category",
        icon: <FolderOpen className="h-4 w-4 mr-1 text-muted-foreground" />,
        handler: handleViewCategoryDetails,
        details: categoryData,
      } as AssociatedEntityInfo;
    }
    if (image.subCategoryId) {
      const subCategoryData = associatedSubCategoryDetails || image.subCategory;
      return {
        type: "Subcategory",
        id: image.subCategoryId,
        name: subCategoryData?.name || "Unknown Subcategory",
        icon: <FolderOpen className="h-4 w-4 mr-1 text-muted-foreground" />,
        handler: handleViewSubCategoryDetails,
        details: subCategoryData,
      } as AssociatedEntityInfo;
    }
    if (image.blogId) {
      // Prioritize detailed blog data, fall back to summary data if detailed isn't available yet
      const blogData = associatedBlogDetails || (image.blog ? { ...image.blog, author: undefined, content: undefined } : undefined);
      return {
        type: "Blog Post",
        id: image.blogId,
        name: blogData?.title || "Unknown Blog Post",
        icon: <BookText className="h-4 w-4 mr-1 text-muted-foreground" />,
        handler: handleViewBlogDetails,
        details: blogData,
      } as AssociatedEntityInfo;
    }
    return null;
  })();

  // --- Main Component Render ---
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

      {/* Header Section */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Image Details
                </h1>
                <p className="text-muted-foreground">Image ID: {image.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="hover:bg-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Images
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Preview and Information Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Image Information
            </CardTitle>
            <CardDescription>Comprehensive details about this image.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Image Preview */}
            <div className="md:col-span-1 flex justify-center items-center">
              <div className="w-full max-w-xs aspect-square rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={`Image for ${image.id}`}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <ImageIcon className="h-20 w-20 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Image Details */}
            <div className="md:col-span-1 grid grid-cols-1">
                <div>
                    <p className="text-muted-foreground">URL:</p>
                    <p className="font-medium text-foreground break-all">
                        <a href={image.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-500">
                            {image.url}
                        </a>
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    {image.isHeroImage && (
                        <div>
                            <p className="text-muted-foreground">Hero Image:</p>
                            <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        </div>
                    )}
                    {image.isLogo && (
                        <div>
                            <p className="text-muted-foreground">Logo:</p>
                            <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        </div>
                    )}
                    {image.isIcon && (
                        <div>
                            <p className="text-muted-foreground">Icon:</p>
                            <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-muted-foreground">Created At:</p>
                    <p className="font-medium text-foreground flex items-center">
                        <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                        {formatDate(image.createdAt)}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground">Last Updated At:</p>
                    <p className="font-medium text-foreground flex items-center">
                        <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                        {formatDate(image.updatedAt)}
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Associated Entity Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-secondary-foreground" /> Associated Entity
            </CardTitle>
            <CardDescription>The entity this image is linked to.</CardDescription>
          </CardHeader>
          <CardContent>
            {associatedEntity ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type:</p>
                  <p className="font-medium text-foreground">
                    {associatedEntity.type}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Name:</p>
                  <p className="font-medium text-foreground flex items-center">
                    {associatedEntity.icon}
                    {associatedEntity.name}
                    {fetchingAssociatedDetails && <LoadingSpinner className="ml-2 h-4 w-4 text-primary" />}
                  </p>
                </div>
                {associatedEntity.type === "Blog Post" && associatedEntity.details && (associatedEntity.details as BlogDetailedForImage).author && (
                    <div>
                        <p className="text-muted-foreground">Author:</p>
                        <p className="font-medium text-foreground">{(associatedEntity.details as BlogDetailedForImage).author}</p>
                    </div>
                )}
                 {associatedEntity.type === "Blog Post" && associatedEntity.details && (associatedEntity.details as BlogDetailedForImage).content && (
                    <div className="md:col-span-2">
                        <p className="text-muted-foreground">Content:</p>
                        <div className="font-medium text-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (associatedEntity.details as BlogDetailedForImage).content || '' }} />
                    </div>
                )}
                <div>
                  <p className="text-muted-foreground">ID:</p>
                  <p className="font-medium text-foreground break-all">{associatedEntity.id}</p>
                </div>

                {/* Display additional details if available */}
                {associatedEntity.details && (
                    <>
                        {associatedEntity.type === "Product" && (associatedEntity.details as ProductDetailsForImage).description && (
                            <div>
                                <p className="text-muted-foreground">Description:</p>
                                <p className="font-medium text-foreground">{(associatedEntity.details as ProductDetailsForImage).description}</p>
                            </div>
                        )}
                        {associatedEntity.type === "Product" && (associatedEntity.details as ProductDetailsForImage).price && (
                            <div>
                                <p className="text-muted-foreground">Price:</p>
                                <p className="font-medium text-foreground">${(associatedEntity.details as ProductDetailsForImage).price.toFixed(2)}</p>
                            </div>
                        )}
                        {associatedEntity.type === "Category" && (associatedEntity.details as CategoryDetailsForImage).description && (
                            <div>
                                <p className="text-muted-foreground">Description:</p>
                                <p className="font-medium text-foreground">{(associatedEntity.details as CategoryDetailsForImage).description}</p>
                            </div>
                        )}
                         {associatedEntity.type === "Subcategory" && (associatedEntity.details as SubCategoryDetailsForImage).description && (
                            <div>
                                <p className="text-muted-foreground">Description:</p>
                                <p className="font-medium text-foreground">{(associatedEntity.details as SubCategoryDetailsForImage).description}</p>
                            </div>
                        )}
                        {/* Blog details are usually just title, which is already displayed as name */}
                    </>
                )}

                <div className="md:col-span-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => associatedEntity.handler(associatedEntity.id)}
                    className="hover:bg-primary"
                    disabled={fetchingAssociatedDetails}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View {associatedEntity.type} Details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-4">
                {fetchingAssociatedDetails ? (
                    <div className="flex items-center justify-center">
                        <LoadingSpinner className="h-5 w-5 text-primary mr-2" />
                        <span>Loading associated entity details...</span>
                    </div>
                ) : (
                    "This image is not currently associated with any product, category, subcategory, or blog post."
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImageDetailsPage;