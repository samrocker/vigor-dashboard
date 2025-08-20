// src/app/admin/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminById, updateAdmin, deleteAdmin } from "@/lib/admin";
import { Admin } from "@/types/schemas/admin";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Info,
  ArrowLeft,
  Edit,
  Trash2,
  Save, // Added Save icon for the button
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedAdminName, setEditedAdminName] = useState("");
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false); // New state for update loading
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (id) {
        try {
          setLoading(true);
          const response = await getAdminById(id as string);
          if (response.status === "success" && response.data?.admin) {
            setAdmin(response.data.admin);
            setEditedAdminName(response.data.admin.name);
          } else {
            // Display error as a toast instead of setting error state
            toast.error(response.message || "Failed to fetch admin details.");
            setAdmin(null); // Explicitly set admin to null to trigger "not found" state if needed
          }
        } catch (err: any) {
          const errorMessage =
            err.message || "An unexpected error occurred.";
          toast.error(errorMessage);
          setAdmin(null); // Set admin to null on error
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAdmin();
  }, [id]);

  const handleEditAdmin = async () => {
    if (!admin) return;
    setIsUpdatingAdmin(true); // Set loading state for update
    try {
      const response = await updateAdmin(admin.id, { name: editedAdminName });
      if (response.status === "success") {
        setAdmin({ ...admin, name: editedAdminName });
        setIsEditDialogOpen(false);
        toast.success("Admin updated successfully.");
      } else {
        toast.error(response.message || "Failed to update admin.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update admin.");
    } finally {
      setIsUpdatingAdmin(false); // Reset loading state
    }
  };

  const handleDeleteAdmin = async () => {
    if (!admin) return;
    setDeletingAdmin(true);
    try {
      const response = await deleteAdmin(admin.id);
      if (response.status === "success") {
        toast.success("Admin deleted successfully.");
        router.push("/admin"); // Redirect to admin list after successful deletion
      } else {
        toast.error(response.message || "Failed to delete admin.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete admin.");
    } finally {
      setDeletingAdmin(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // --- Render Loading/Error/Not Found States ---
  if (loading && !admin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4 w-full"
      >
        <div className="w-full max-w-7xl mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[...Array(6)].map((_, idx) => (
                <div key={idx}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // If not loading and no admin found (e.g., invalid ID or API error resulted in null admin)
  if (!admin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Admin not found.</p>
              <Button
                onClick={() => router.push('/admin')}
                className="mt-4"
                variant="outline"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
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
                <UserIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {admin?.name} {/* Display name directly */}
                </h1>
                <span className="text-muted-foreground">
                  {admin?.email} {/* Display email directly */}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedAdminName(admin?.name || "");
                  setIsEditDialogOpen(true);
                }}
                className="hover:bg-primary"
                aria-label="Edit admin details"
                disabled={loading} // Disable if overall page is still loading
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit {admin?.role} ADMIN
              </Button>
              {/* Only show delete button if admin exists and is not a SUPER admin */}
              {admin && admin.role !== "SUPER" && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="hover:bg-destructive/90"
                  aria-label="Delete admin"
                  disabled={loading} // Disable if overall page is still loading
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {admin.role} Admin
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="hover:bg-primary"
                aria-label="Go back to admins list"
                disabled={loading} // Disable if overall page is still loading
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admins
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin Information
              </CardTitle>
              <CardDescription>Details about this admin account.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">ID:</p>
                <span className="font-medium text-foreground break-all">{admin?.id || <Skeleton className="h-4 w-48" />}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Name:</p>
                <span className="font-medium text-foreground">{admin?.name || <Skeleton className="h-4 w-32" />}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Email:</p>
                <span className="font-medium text-foreground">
                  <Mail className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {admin?.email || <Skeleton className="h-4 w-48" />}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Role:</p>
                <span className="font-medium text-foreground">
                  <Shield className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {admin?.role} ADMIN
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Created At:</p>
                <span className="font-medium text-foreground">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(admin?.createdAt || null) || <Skeleton className="h-4 w-32" />}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Updated At:</p>
                <span className="font-medium text-foreground">
                  <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                  {formatDate(admin?.updatedAt || null) || <Skeleton className="h-4 w-32" />}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit {admin?.role} ADMIN</DialogTitle>
            <DialogDescription>Edit the details of the admin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editedAdminName}
                onChange={(e) => setEditedAdminName(e.target.value)}
                className="col-span-3"
                disabled={isUpdatingAdmin} // Disable input while updating
                maxLength={100} // Example: Max length for admin name
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdatingAdmin} // Disable cancel button while updating
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleEditAdmin}
              disabled={isUpdatingAdmin} // Disable save button while updating
            >
              {isUpdatingAdmin ? (
                <div className="flex items-center">
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
      {admin?.role !== "SUPER" && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                <Trash2 className="inline-block mr-2 h-6 w-6 text-destructive" />
                Confirm Admin Deletion
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this admin? This action cannot be undone.
            </p>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deletingAdmin}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAdmin}
                disabled={deletingAdmin}
                variant="destructive"
              >
                {deletingAdmin ? (
                  <div className="flex items-center">
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Deleting...
                  </div>
                ) : (
                  "Delete Permanently"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminDetailPage;