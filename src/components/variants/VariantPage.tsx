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
import {
  Package,
  Info,
  Calendar,
  ArrowLeft,
  DollarSign,
  Boxes,
  XCircle,
  Type,
  ListOrdered,
  ShoppingCart,
  FolderOpen,
  Eye,
  Plus,
  Edit,
  X,
  CheckCircle,
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
import { AxiosError } from "axios";
import { LoadingSpinner } from "../ui/loading-spinner";

// --- Type Definitions ---

interface ProductForVariantDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number;
  COD: boolean;
  stock: number;
  subCategory?: {
    name: string;
  };
  additionalDetails?: { [key: string]: any };
}

interface CartItemForVariant {
  id: string;
  cartId: string;
  quantity: number;
  price: number;
  createdAt: string;
}

interface OrderItemForVariant {
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  createdAt: string;
}

export interface VariantDetails {
  id: string;
  productId: string;
  name: string;
  value: { [key: string]: string };
  price: number;
  originalPrice?: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  cartItems?: CartItemForVariant[];
  orderItems?: OrderItemForVariant[];
  product?: ProductForVariantDetails;
}

interface VariantDetailsApiResponse extends ApiResponse {
  data: {
    variant: VariantDetails;
  };
}

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

type FormErrors = {
  name?: string;
  price?: string;
  originalPrice?: string;
  stock?: string;
  value?: string;
};

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

const handleApiError = (error: any, context: "fetching" | "updating") => {
  const axiosError = error as AxiosError<ApiResponse>;
  console.error(`API Error during ${context}:`, axiosError);
  const message =
    axiosError.response?.data?.message ||
    `An unexpected error occurred while ${context} the variant.`;
  toast.error(message);
};

// --- Component ---

const VariantDetailsPage = () => {
  const params = useParams();
  const variantId = params.id as string;
  const router = useRouter();

  const [variant, setVariant] = useState<VariantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: "",
    name: "",
    value: [] as KeyValuePair[],
    price: 0,
    originalPrice: 0,
    stock: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFormErrors, setUpdateFormErrors] = useState<FormErrors>({});

  const fetchVariantDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<VariantDetailsApiResponse>(
        `/public/variant/${id}?includeRelations=true`
      );
      if (response.data.status === "success" && response.data.data?.variant) {
        setVariant(response.data.data.variant);
      } else {
        toast.error(
          response.data.message || "Failed to fetch variant details."
        );
        setVariant(null);
      }
    } catch (err: any) {
      handleApiError(err, "fetching");
      setVariant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (variantId) {
      fetchVariantDetails(variantId);
    }
  }, [variantId, fetchVariantDetails]);

  // --- Navigation Handlers ---
  const handleViewProductDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  const handleViewCartDetails = (cartId: string) => {
    router.push(`/cart/${cartId}`);
  };

  // --- Form Handlers ---
  const openUpdateDialog = () => {
    if (!variant) return;
    const valueArray: KeyValuePair[] = variant.value
      ? Object.entries(variant.value).map(([key, val]) => ({
          id: crypto.randomUUID(),
          key,
          value: String(val),
        }))
      : [];

    setUpdateForm({
      id: variant.id,
      name: variant.name,
      value: valueArray,
      price: variant.price,
      originalPrice: variant.originalPrice || variant.price,
      stock: variant.stock,
    });
    setUpdateFormErrors({});
    setIsUpdateDialogOpen(true);
  };

  const handleValueChange = (
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    setUpdateForm((prev) => ({
      ...prev,
      value: prev.value.map((detail) =>
        detail.id === id ? { ...detail, [field]: newValue } : detail
      ),
    }));
  };

  const handleAddValueField = () => {
    const newField = { id: crypto.randomUUID(), key: "", value: "" };
    setUpdateForm((prev) => ({ ...prev, value: [...prev.value, newField] }));
  };

  const handleRemoveValueField = (idToRemove: string) => {
    setUpdateForm((prev) => ({
      ...prev,
      value: prev.value.filter((detail) => detail.id !== idToRemove),
    }));
  };

  const validateVariantForm = (form: typeof updateForm): FormErrors => {
    const errors: FormErrors = {};
    if (!form.name.trim()) errors.name = "Variant name is required.";
    if (form.price <= 0) errors.price = "Price must be a positive number.";
    if (form.originalPrice < form.price)
      errors.originalPrice =
        "Original price must be greater than or equal to the selling price.";
    if (form.stock < 0 || !Number.isInteger(form.stock))
      errors.stock = "Stock must be a non-negative integer.";
    const hasAtLeastOneDetail = form.value.some(
      (d) => d.key.trim() && d.value.trim()
    );
    if (!hasAtLeastOneDetail) {
      errors.value = "At least one complete key-value pair is required.";
    } else {
      for (const detail of form.value) {
        if (
          (detail.key.trim() && !detail.value.trim()) ||
          (!detail.key.trim() && detail.value.trim())
        ) {
          errors.value = "All fields must have both a key and a value.";
          break;
        }
      }
    }
    return errors;
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateFormErrors({});
    const validationErrors = validateVariantForm(updateForm);
    if (Object.keys(validationErrors).length > 0) {
      setUpdateFormErrors(validationErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }
    setIsUpdating(true);
    try {
      const valueObject: { [key: string]: string } = {};
      updateForm.value.forEach((detail) => {
        if (detail.key.trim()) {
          valueObject[detail.key.trim()] = detail.value.trim();
        }
      });
      const payload = {
        name: updateForm.name.trim(),
        price: Number(updateForm.price),
        originalPrice: Number(updateForm.originalPrice),
        stock: Number(updateForm.stock),
        value: valueObject,
      };
      const response = await axiosInstance.patch(
        `/admin/variant/${updateForm.id}`,
        payload
      );
      if (response.data.status === "success") {
        toast.success("Variant updated successfully!");
        setIsUpdateDialogOpen(false);
        fetchVariantDetails(updateForm.id);
      }
    } catch (err: any) {
      handleApiError(err, "updating");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 w-full">
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

  if (!variant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md text-center p-8">
          <Info className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Variant Not Found</h2>
          <Button onClick={() => router.push("/variant")} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Variants
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-muted">
              <Type className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{variant.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {variant.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openUpdateDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Variant
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/product/${variant.productId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Product
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" /> Variant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <span className="font-medium text-lg">{variant.name}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Price</p>
                <span className="font-medium text-lg flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  {formatCurrency(variant.price)}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Original Price</p>
                <span className="font-medium text-lg flex items-center text-muted-foreground line-through">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {formatCurrency(variant.originalPrice || 0)}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Stock</p>
                <Badge
                  variant={variant.stock === 0 ? "destructive" : "default"}
                  className="text-base"
                >
                  {variant.stock} units
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <span className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(variant.createdAt)}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <span className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(variant.updatedAt)}
                </span>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-muted-foreground">Value</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(variant.value || {}).map(([key, val]) => (
                    <Badge key={key} variant="secondary">
                      <span className="font-semibold mr-1">{key}:</span>
                      {val}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {variant.product && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" /> Parent Product
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Product Name</p>
                  <span className="font-medium text-lg">
                    {variant.product.name}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Product Price</p>
                  <span className="font-medium text-lg flex items-center">
                    {formatCurrency(variant.product.price)}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Original Price</p>
                  <span className="font-medium text-lg line-through text-muted-foreground flex items-center">
                    {formatCurrency(variant.product.originalPrice)}
                  </span>
                </div>
                <div className="lg:col-span-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleViewProductDetails(variant.product!.id)
                    }
                  >
                    <Eye className="h-4 w-4 mr-1" /> View Full Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Cart Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {variant.cartItems && variant.cartItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cart ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Added At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variant.cartItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.cartId}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCartDetails(item.cartId)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Cart
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  This variant is not in any active carts.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {variant.orderItems && variant.orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Ordered At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variant.orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.orderId}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrderDetails(item.orderId)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  This variant has not been ordered yet.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateVariant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="updateName"
                  className="block text-sm font-medium"
                >
                  Variant Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateName"
                  value={updateForm.name}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, name: e.target.value })
                  }
                  disabled={isUpdating}
                />
                {updateFormErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="updatePrice"
                  className="block text-sm font-medium"
                >
                  Price <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updatePrice"
                  type="number"
                  value={updateForm.price}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      price: Number(e.target.value),
                    })
                  }
                  disabled={isUpdating}
                />
                {updateFormErrors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.price}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="updateOriginalPrice"
                  className="block text-sm font-medium"
                >
                  Original Price
                </label>
                <Input
                  id="updateOriginalPrice"
                  type="number"
                  value={updateForm.originalPrice}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      originalPrice: Number(e.target.value),
                    })
                  }
                  disabled={isUpdating}
                />
                {updateFormErrors.originalPrice && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.originalPrice}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="updateStock"
                  className="block text-sm font-medium"
                >
                  Stock <span className="text-destructive">*</span>
                </label>
                <Input
                  id="updateStock"
                  type="number"
                  value={updateForm.stock}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      stock: Number(e.target.value),
                    })
                  }
                  disabled={isUpdating}
                />
                {updateFormErrors.stock && (
                  <p className="text-sm text-destructive mt-1">
                    {updateFormErrors.stock}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="block text-sm font-medium">
                  Value Details <span className="text-destructive">*</span>
                </p>
                <div className="space-y-2">
                  {updateForm.value.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Key"
                        value={detail.key}
                        onChange={(e) =>
                          handleValueChange(detail.id, "key", e.target.value)
                        }
                        disabled={isUpdating}
                      />
                      <Input
                        placeholder="Value"
                        value={detail.value}
                        onChange={(e) =>
                          handleValueChange(detail.id, "value", e.target.value)
                        }
                        disabled={isUpdating}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveValueField(detail.id)}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {updateFormErrors.value && (
                    <p className="text-sm text-destructive">
                      {updateFormErrors.value}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddValueField}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Value
                  </Button>
                </div>
              </div>
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
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Updating...
                  </>
                ) : (
                  "Update Variant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
 
export default VariantDetailsPage;
