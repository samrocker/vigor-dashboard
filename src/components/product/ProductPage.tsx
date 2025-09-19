"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Table,
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
  Package,
  Info,
  Calendar,
  ArrowLeft,
  DollarSign,
  Boxes,
  XCircle,
  ImageIcon,
  Type,
  ListOrdered,
  MessageSquare,
  Star,
  FolderOpen,
  Eye,
  Plus,
  Trash2,
  UploadCloud,
  X,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Type Definitions ---

interface AdditionalDetails {
  [key: string]: string;
}

interface VariantForRelatedItemDetails {
  id: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
}

interface UserForRelatedItemDetails {
  id: string;
  name: string;
  email: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

interface ProductImage {
  id: string;
  url: string;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductDetails {
  id: string;
  name: string;
  description: string | null;
  additionalDetails?: AdditionalDetails;
  price: number;
  originalPrice: number;
  COD: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  subCategoryId: string | null;
  orderItems?: OrderItem[];
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  subCategory?: SubCategory;
}

export interface user {
  data: {
    users: UserForRelatedItemDetails[];
  };
  status: string;
}

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

type EditFormErrors = {
  name?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  stock?: string;
  additionalDetails?: string;
};

type VariantFormErrors = {
  name?: string;
  price?: string;
  stock?: string;
  value?: string;
};

interface SubCategoryOption {
  id: string;
  name: string;
}

// --- API Response Type Definitions ---

interface ProductDetailsApiResponse extends ApiResponse {
  data: {
    product: ProductDetails;
  };
}

interface MultipleImagesApiResponse extends ApiResponse {
  data: {
    images: { id: string; url: string }[];
  };
}

interface ProductImagesData {
  images: ProductImage[];
  total: number;
  page: number;
  limit: number;
}

interface ProductImagesApiResponse extends ApiResponse {
  data: {
    images: ProductImagesData;
  };
}

// --- Utility Functions ---

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// --- Component ---

const ProductDetailsPage = () => {
  const params = useParams();
  const productId = params.id as string;
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(true);

  const [relatedVariantDetailsMap, setRelatedVariantDetailsMap] = useState<
    Map<string, VariantForRelatedItemDetails>
  >(new Map());
  const [relatedUserDetailsMap, setRelatedUserDetailsMap] = useState<
    Map<string, UserForRelatedItemDetails>
  >(new Map());
  const [loadingRelatedItems, setLoadingRelatedItems] =
    useState<boolean>(false);

  // Product Edit States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [subCategoriesOptions, setSubCategoriesOptions] = useState<
    SubCategoryOption[]
  >([]);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: 0,
    originalPrice: 0,
    stock: 0,
    COD: false,
    subCategoryId: null as string | null,
    additionalDetails: [] as KeyValuePair[],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<EditFormErrors>({});

  // Image Management States
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [isUploadImageLoading, setIsUploadImageLoading] = useState(false);
  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [isDeleteImageLoading, setIsDeleteImageLoading] = useState(false);

  // Variant Management States
  const [isCreateVariantDialogOpen, setIsCreateVariantDialogOpen] =
    useState(false);
  const [createVariantForm, setCreateVariantForm] = useState({
    name: "",
    price: 0,
    stock: 0,
    value: [] as KeyValuePair[],
  });
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [createVariantErrors, setCreateVariantErrors] =
    useState<VariantFormErrors>({});

  // --- Data Fetching ---

  const fetchProductDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ProductDetailsApiResponse>(
        `/public/product/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.product) {
        setProduct(response.data.data.product);
      } else {
        toast.error(
          response.data.message || "Failed to fetch product details."
        );
        setProduct(null);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "An error occurred fetching product details."
      );
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductImages = useCallback(async (id: string) => {
    setImagesLoading(true);
    try {
      const response = await axiosInstance.get<ProductImagesApiResponse>(
        `/public/product/${id}/images`
      );
      if (
        response.data.status === "success" &&
        response.data.data?.images?.images
      ) {
        setProductImages(response.data.data.images.images);
      } else {
        toast.error(response.data.message || "Failed to fetch product images.");
        setProductImages([]);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "An error occurred while fetching images."
      );
      setProductImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  const fetchSubCategoriesForForm = useCallback(async () => {
    try {
      const response = await axiosInstance.get<
        ApiResponse<{ subCategories: { id: string; name: string }[] }>
      >("/public/sub-category");
      if (response.data.status === "success" && response.data.data) {
        setSubCategoriesOptions(response.data.data.subCategories || []);
      }
    } catch (err) {
      console.error("Failed to fetch subcategories for form:", err);
      toast.error("Failed to load subcategories for the edit form.");
    }
  }, []);

  useEffect(() => {
    if (productId) {
      fetchProductDetails(productId);
      fetchProductImages(productId);
      fetchSubCategoriesForForm();
    }
  }, [productId, fetchProductDetails, fetchProductImages, fetchSubCategoriesForForm]);

  useEffect(() => {
    const fetchRelatedItemDetails = async () => {
      if (!product) return;
      setLoadingRelatedItems(true);
      const uniqueVariantIds = new Set<string>();
      const uniqueUserIds = new Set<string>();

      product.orderItems?.forEach((item) => {
        if (item.variantId) uniqueVariantIds.add(item.variantId);
      });
      product.reviews?.forEach((review) => {
        uniqueUserIds.add(review.userId);
      });

      const newVariantDetails = new Map<string, VariantForRelatedItemDetails>();
      const newUserDetails = new Map<string, UserForRelatedItemDetails>();

      const variantPromises = Array.from(uniqueVariantIds).map(async (vId) => {
        try {
          const res = await axiosInstance.get(
            `/public/variant/${vId}?includeRelations=true`
          );
          if (res.data.status === "success" && res.data.data?.variant) {
            newVariantDetails.set(vId, res.data.data.variant);
          }
        } catch (err) {
          console.error(`Failed to fetch variant ${vId}:`, err);
        }
      });

      const userPromises = (async () => {
        if (uniqueUserIds.size === 0) return;
        try {
          const res = await axiosInstance.post<user>("/admin/user/batch", {
            ids: Array.from(uniqueUserIds),
          });
          if (res.data.status === "success" && res.data.data?.users) {
            res.data.data.users.forEach((user) =>
              newUserDetails.set(user.id, user)
            );
          }
        } catch (err) {
          console.error("Failed to fetch users:", err);
        }
      })();

      await Promise.allSettled([...variantPromises, userPromises]);
      setRelatedVariantDetailsMap(newVariantDetails);
      setRelatedUserDetailsMap(newUserDetails);
      setLoadingRelatedItems(false);
    };

    fetchRelatedItemDetails();
  }, [product]);

  // --- Navigation Handlers ---

  const handleViewOrderDetails = (orderId: string) =>
    router.push(`/order/${orderId}`);
  const handleViewUserDetails = (userId: string) =>
    router.push(`/users/${userId}`);
  const handleViewVariantDetails = (variantId: string) =>
    router.push(`/variant/${variantId}`);
  const handleViewImageDetails = (imageId: string) =>
    router.push(`/image/${imageId}`);

  // --- Product Edit Handlers ---
  const openEditDialog = () => {
    if (!product) return;
    const additionalDetailsArray: KeyValuePair[] = product.additionalDetails
      ? Object.entries(product.additionalDetails).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key: key,
          value: String(value),
        }))
      : [];

    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || 0,
      stock: product.stock,
      COD: product.COD,
      subCategoryId: product.subCategoryId,
      additionalDetails: additionalDetailsArray,
    });
    setEditFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleAdditionalDetailChange = (
    formType: "edit",
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      additionalDetails: prev.additionalDetails.map((detail) =>
        detail.id === id ? { ...detail, [field]: newValue } : detail
      ),
    }));
  };

  const handleAddAdditionalDetailField = (formType: "edit") => {
    const newField = { id: crypto.randomUUID(), key: "", value: "" };
    setEditForm((prev) => ({
      ...prev,
      additionalDetails: [...prev.additionalDetails, newField],
    }));
  };

  const handleRemoveAdditionalDetailField = (
    formType: "edit",
    idToRemove: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      additionalDetails: prev.additionalDetails.filter(
        (detail) => detail.id !== idToRemove
      ),
    }));
  };

  const validateEditForm = () => {
    const errors: EditFormErrors = {};
    if (!editForm.name.trim()) errors.name = "Product Name is required.";
    if (!editForm.description.trim())
      errors.description = "Description is required.";
    if (Number(editForm.price) <= 0)
      errors.price = "Price must be greater than 0.";
    if (Number(editForm.originalPrice) < Number(editForm.price))
        errors.originalPrice = "Original price must be greater than or equal to the selling price.";
    if (Number(editForm.stock) < 0 || !Number.isInteger(Number(editForm.stock)))
      errors.stock = "Stock must be a non-negative integer.";

    const filledDetails = editForm.additionalDetails.filter(
      (d) => d.key.trim() && d.value.trim()
    );
    if (filledDetails.length !== editForm.additionalDetails.length) {
      errors.additionalDetails =
        "All detail fields must have both a key and a value.";
    } else if (filledDetails.length === 0) {
      errors.additionalDetails = "At least one additional detail is required.";
    }
    return errors;
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateEditForm();
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsUpdating(true);
    try {
      const additionalDetailsObject = editForm.additionalDetails.reduce(
        (acc, { key, value }) => {
          if (key.trim() && value.trim()) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        },
        {} as AdditionalDetails
      );

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price: Number(editForm.price),
        originalPrice: Number(editForm.originalPrice),
        stock: Number(editForm.stock),
        COD: editForm.COD,
        subCategoryId:
          editForm.subCategoryId === "none" ? null : editForm.subCategoryId,
        additionalDetails: additionalDetailsObject,
        imageIds: productImages.map((img) => img.id),
      };

      await axiosInstance.patch(`/admin/product/${productId}`, payload);
      toast.success("Product updated successfully!");
      setIsEditDialogOpen(false);
      fetchProductDetails(productId); // Refresh data
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update the product."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Image Management Handlers ---

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFilesArray = Array.from(files);
    setUploadImages((prevImages) => [...prevImages, ...newFilesArray]);
    e.target.value = "";
  };

  const handleRemoveSelectedImage = (indexToRemove: number) => {
    setUploadImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleUploadAndAssociateImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadImages.length === 0 || !product) {
      toast.error("No images selected or product data is missing.");
      return;
    }

    setIsUploadImageLoading(true);
    try {
      const formData = new FormData();
      uploadImages.forEach((file) => formData.append("images", file));

      const imageUploadResponse =
        await axiosInstance.post<MultipleImagesApiResponse>(
          "/admin/image/multiple",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

      if (
        imageUploadResponse.data.status !== "success" ||
        !imageUploadResponse.data.data?.images
      ) {
        throw new Error(
          imageUploadResponse.data.message || "Image upload failed."
        );
      }

      const newImageIds = imageUploadResponse.data.data.images.map(
        (img) => img.id
      );

      const existingImageIds = productImages.map((img) => img.id);
      const allImageIds = [...existingImageIds, ...newImageIds];

      const updatePayload = {
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        stock: product.stock,
        COD: product.COD,
        additionalDetails: product.additionalDetails || {},
        imageIds: allImageIds,
      };

      await axiosInstance.patch(`/admin/product/${productId}`, updatePayload);

      toast.success("Images uploaded and associated successfully!");
      setIsUploadImageDialogOpen(false);
      fetchProductImages(productId);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "An unexpected error occurred."
      );
    } finally {
      setIsUploadImageLoading(false);
    }
  };

  const handleOpenDeleteImageDialog = (imageId: string) => {
    setImageToDeleteId(imageId);
    setIsDeleteImageDialogOpen(true);
  };

  const handleConfirmDeleteImage = async () => {
    if (!imageToDeleteId) return;
    setIsDeleteImageLoading(true);
    try {
      await axiosInstance.delete(`/admin/image/${imageToDeleteId}`);
      toast.success("Image deleted successfully!");
      setIsDeleteImageDialogOpen(false);
      fetchProductImages(productId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete image.");
    } finally {
      setIsDeleteImageLoading(false);
    }
  };

  // --- Variant Management Handlers ---

  const handleAddValueField = () => {
    setCreateVariantForm((prev) => ({
      ...prev,
      value: [...prev.value, { id: crypto.randomUUID(), key: "", value: "" }],
    }));
  };

  const handleRemoveValueField = (idToRemove: string) => {
    setCreateVariantForm((prev) => ({
      ...prev,
      value: prev.value.filter((detail) => detail.id !== idToRemove),
    }));
  };

  const handleValueChange = (
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    setCreateVariantForm((prev) => ({
      ...prev,
      value: prev.value.map((detail) =>
        detail.id === id ? { ...detail, [field]: newValue } : detail
      ),
    }));
  };

  const validateVariantForm = (): VariantFormErrors => {
    const errors: VariantFormErrors = {};
    if (!createVariantForm.name.trim())
      errors.name = "Variant name is required.";
    if (createVariantForm.price < 0) errors.price = "Price cannot be negative.";
    if (
      createVariantForm.stock < 0 ||
      !Number.isInteger(createVariantForm.stock)
    ) {
      errors.stock = "Stock must be a non-negative integer.";
    }
    const hasAtLeastOneDetail = createVariantForm.value.some(
      (d) => d.key.trim() && d.value.trim()
    );
    if (!hasAtLeastOneDetail) {
      errors.value = "At least one complete key-value pair is required.";
    }
    return errors;
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateVariantErrors({});
    const validationErrors = validateVariantForm();

    if (Object.keys(validationErrors).length > 0) {
      setCreateVariantErrors(validationErrors);
      return;
    }

    setIsCreatingVariant(true);
    try {
      const valueObject = createVariantForm.value.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value.trim();
          return acc;
        },
        {} as { [key: string]: string }
      );

      const payload = {
        productId: productId,
        name: createVariantForm.name.trim(),
        price: Number(createVariantForm.price),
        stock: Number(createVariantForm.stock),
        value: valueObject,
      };

      await axiosInstance.post("/admin/variant", payload);
      toast.success("Variant created successfully!");
      setIsCreateVariantDialogOpen(false);
      fetchProductDetails(productId); // Re-fetch to update the variant list
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create variant.");
    } finally {
      setIsCreatingVariant(false);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-8 w-1/4 mb-8" />
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md text-center p-8">
          <Info className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Product Not Found</h2>
          <Button onClick={() => router.push("/product")} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Products
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-muted">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {product.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
            <Button variant="outline" onClick={() => router.push("/product")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Product Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <span className="font-medium text-lg">{product.name}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Price</p>
                <span className="font-medium text-lg flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  {formatCurrency(product.price)}
                </span>
              </div>
               <div>
                <p className="text-muted-foreground">Original Price</p>
                <span className="font-medium text-lg flex items-center text-foreground">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {formatCurrency(product.originalPrice)}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Stock</p>
                <Badge
                  variant={product.stock === 0 ? "destructive" : "default"}
                  className="text-base"
                >
                  {product.stock} units
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Cash on Delivery</p>
                <Badge variant={product.COD ? "default" : "secondary"}>
                  {product.COD ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">SubCategory</p>
                <span className="font-medium flex items-center">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  {product.subCategory?.name || "N/A"}
                </span>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium whitespace-pre-wrap">
                  {product.description || "N/A"}
                </p>
              </div>
              {product.additionalDetails &&
                Object.keys(product.additionalDetails).length > 0 && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-muted-foreground mb-2">
                      Additional Details
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                      {Object.entries(product.additionalDetails).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="capitalize font-semibold text-muted-foreground">
                              {key}:
                            </p>
                            <span>{String(value)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Images Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" /> Product Images
              </CardTitle>
              <Button
                onClick={() => setIsUploadImageDialogOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Images
              </Button>
            </CardHeader>
            <CardContent>
              {imagesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-md" />
                  ))}
                </div>
              ) : productImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {productImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative aspect-square rounded-md overflow-hidden border group"
                    >
                      <img
                        src={image.url}
                        alt={`Product image ${image.id}`}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleViewImageDetails(image.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              handleOpenDeleteImageDialog(image.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="mx-auto h-12 w-12" />
                  <p className="mt-2">No images found for this product.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Variants Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" /> Product Variants
              </CardTitle>
              <Button
                onClick={() => setIsCreateVariantDialogOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Variant
              </Button>
            </CardHeader>
            <CardContent>
              {product.variants && product.variants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{formatCurrency(v.price)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              v.stock === 0 ? "destructive" : "secondary"
                            }
                          >
                            {v.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(v.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVariantDetails(v.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No variants found.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Reviews Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Product Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.reviews && product.reviews.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-medium">
                          {loadingRelatedItems
                            ? "..."
                            : relatedUserDetailsMap.get(review.userId)?.name ||
                              "Unknown User"}
                        </TableCell>
                        <TableCell className="flex items-center">
                          {review.rating}{" "}
                          <Star className="h-4 w-4 ml-1 text-yellow-500" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {review.comment || "No comment"}
                        </TableCell>
                        <TableCell>{formatDate(review.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No reviews found.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Order Items Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.orderItems && product.orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.orderId}
                        </TableCell>
                        <TableCell>
                          {loadingRelatedItems
                            ? "..."
                            : relatedVariantDetailsMap.get(item.variantId!)
                                ?.name || "N/A"}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No order items found.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- Dialogs --- */}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit {product.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="editName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Product Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="editName"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  disabled={isUpdating}
                />
                {editFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {editFormErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="editPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="editPrice"
                  type="number"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      price: e.target.valueAsNumber || 0,
                    })
                  }
                  disabled={isUpdating}
                />
                {editFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {editFormErrors.price}
                  </p>
                )}
              </div>
               <div>
                <label
                  htmlFor="editOriginalPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Original Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="editOriginalPrice"
                  type="number"
                  value={editForm.originalPrice}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      originalPrice: e.target.valueAsNumber || 0,
                    })
                  }
                  disabled={isUpdating}
                />
                {editFormErrors.originalPrice && (
                  <p className="text-sm text-destructive mt-1">
                    {editFormErrors.originalPrice}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="editStock"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Stock <span className="text-destructive">*</span>
                </label>
                <Input
                  id="editStock"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      stock: e.target.valueAsNumber || 0,
                    })
                  }
                  disabled={isUpdating}
                />
                {editFormErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {editFormErrors.stock}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="editDescription"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="editDescription"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description: e.target.value,
                    })
                  }
                  disabled={isUpdating}
                  rows={4}
                />
                {editFormErrors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {editFormErrors.description}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="editSubCategory"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  SubCategory
                </label>
                <Select
                  value={editForm.subCategoryId ?? "none"}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      subCategoryId: value === "none" ? null : value,
                    })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Subcategory</SelectItem>
                    {subCategoriesOptions.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Additional Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {editForm.additionalDetails.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "edit",
                            detail.id,
                            "key",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                      />
                      <Input
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleAdditionalDetailChange(
                            "edit",
                            detail.id,
                            "value",
                            e.target.value
                          )
                        }
                        disabled={isUpdating}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAdditionalDetailField("edit", detail.id)}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editFormErrors.additionalDetails && (
                    <p className="text-sm text-destructive mt-1">
                      {editFormErrors.additionalDetails}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddAdditionalDetailField("edit")}
                    disabled={isUpdating}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Detail
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editCOD"
                  checked={editForm.COD}
                  onChange={(e) => setEditForm({...editForm, COD: e.target.checked})}
                  disabled={isUpdating}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="editCOD" className="text-sm">COD Available</label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Image Dialog */}
      <Dialog
        open={isUploadImageDialogOpen}
        onOpenChange={(open) => {
          setIsUploadImageDialogOpen(open);
          if (!open) setUploadImages([]);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Images for {product.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadAndAssociateImages} className="space-y-6">
            <div>
              <label
                htmlFor="uploadImageFile"
                className="relative cursor-pointer flex justify-center w-full px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-primary"
              >
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-primary font-medium">
                    Click to upload files
                  </span>
                  <Input
                    id="uploadImageFile"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="sr-only"
                  />
                </div>
              </label>
            </div>
            {uploadImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Selected ({uploadImages.length}):
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                  {uploadImages.map((file, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="w-full h-full object-cover rounded-md"
                        onLoad={(e) =>
                          URL.revokeObjectURL(
                            (e.target as HTMLImageElement).src
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveSelectedImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadImageDialogOpen(false)}
                disabled={isUploadImageLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploadImageLoading || uploadImages.length === 0}
              >
                {isUploadImageLoading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Uploading...
                  </>
                ) : (
                  `Upload ${uploadImages.length} Image(s)`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Image Dialog */}
      <Dialog
        open={isDeleteImageDialogOpen}
        onOpenChange={setIsDeleteImageDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this image? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteImageDialogOpen(false)}
              disabled={isDeleteImageLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteImage}
              disabled={isDeleteImageLoading}
            >
              {isDeleteImageLoading ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-1" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Variant Dialog */}
      <Dialog
        open={isCreateVariantDialogOpen}
        onOpenChange={(open) => {
          setIsCreateVariantDialogOpen(open);
          if (!open) {
            setCreateVariantErrors({});
            setCreateVariantForm({ name: "", price: 0, stock: 0, value: [] });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Variant to {product.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVariant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="createName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Variant Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createName"
                  type="text"
                  value={createVariantForm.name}
                  onChange={(e) =>
                    setCreateVariantForm({
                      ...createVariantForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Black Small"
                  disabled={isCreatingVariant}
                />
                {createVariantErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {createVariantErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="createPrice"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createPrice"
                  type="number"
                  value={createVariantForm.price}
                  onChange={(e) =>
                    setCreateVariantForm({
                      ...createVariantForm,
                      price: Number(e.target.value),
                    })
                  }
                  disabled={isCreatingVariant}
                  min="0"
                />
                {createVariantErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {createVariantErrors.price}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="createStock"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Stock <span className="text-destructive">*</span>
                </label>
                <Input
                  id="createStock"
                  type="number"
                  value={createVariantForm.stock}
                  onChange={(e) =>
                    setCreateVariantForm({
                      ...createVariantForm,
                      stock: Number(e.target.value),
                    })
                  }
                  disabled={isCreatingVariant}
                  min="0"
                />
                {createVariantErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {createVariantErrors.stock}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-foreground mb-1">
                  Value Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {createVariantForm.value.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Key (e.g., Color)"
                        value={detail.key}
                        onChange={(e) =>
                          handleValueChange(detail.id, "key", e.target.value)
                        }
                        disabled={isCreatingVariant}
                        className="w-1/2"
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g., Red)"
                        value={detail.value}
                        onChange={(e) =>
                          handleValueChange(detail.id, "value", e.target.value)
                        }
                        disabled={isCreatingVariant}
                        className="w-1/2"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveValueField(detail.id)}
                        disabled={isCreatingVariant}
                        className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {createVariantErrors.value && (
                    <p className="text-sm text-destructive mt-1">
                      {createVariantErrors.value}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddValueField}
                    disabled={isCreatingVariant}
                    className="w-full flex items-center gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add Value Field
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateVariantDialogOpen(false)}
                disabled={isCreatingVariant}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingVariant}>
                {isCreatingVariant ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Creating...
                  </>
                ) : (
                  "Create Variant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetailsPage;