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
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Info,
  ArrowLeft,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedAdminName, setEditedAdminName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(false);
  const { toast } = useToast();

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
            throw new Error(response.message || "Failed to fetch admin details.");
          }
        } catch (err: any) {
          const errorMessage = err.message || "An unexpected error occurred.";
          setError(errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAdmin();
  }, [id, toast]);

  const handleEditAdmin = async () => {
    if (!admin) return;
    try {
      await updateAdmin(admin.id, { name: editedAdminName });
      setAdmin({ ...admin, name: editedAdminName });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Admin updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update admin.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async () => {
    if (!admin) return;
    setDeletingAdmin(true);
    try {
      await deleteAdmin(admin.id);
      toast({
        title: "Success",
        description: "Admin deleted successfully.",
      });
      router.push("/admin");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete admin.",
        variant: "destructive",
      });
    } finally {
      setDeletingAdmin(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="ml-3 text-muted-foreground">Loading admin details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-destructive bg-destructive/10 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-destructive-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Error: {error}</p>
              <Button
                onClick={() => router.back()}
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

  if (!admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="border-border w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center font-medium">
              <Info className="h-8 w-8 mx-auto mb-3" />
              <p>Admin not found.</p>
              <Button
                onClick={() => router.back()}
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
        theme="colored"
        toastClassName="bg-background border-border text-foreground"
      />

      {/* Header Section */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <UserIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{admin.name}</h1>
                <p className="text-muted-foreground">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedAdminName(admin.name);
                  setIsEditDialogOpen(true);
                }}
                className="hover:bg-primary"
                aria-label="Edit admin details"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Admin
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="hover:bg-destructive/90"
                aria-label="Delete admin"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="hover:bg-primary"
                aria-label="Go back to admins list"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admins
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <p className="font-medium text-foreground break-all">{admin.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Name:</p>
              <p className="font-medium text-foreground">{admin.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email:</p>
              <p className="font-medium text-foreground">
                <Mail className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {admin.email}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Role:</p>
              <p className="font-medium text-foreground">
                <Shield className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {admin.role}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created At:</p>
              <p className="font-medium text-foreground">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(admin.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Updated At:</p>
              <p className="font-medium text-foreground">
                <Calendar className="h-4 w-4 inline mr-1 text-muted-foreground" />
                {formatDate(admin.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleEditAdmin}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
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
    </div>
  );
};

export default AdminDetailPage;