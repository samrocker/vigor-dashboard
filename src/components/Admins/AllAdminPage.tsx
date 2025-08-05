import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Info,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Filter,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export interface Admin {
  id: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminsData {
  admins: Admin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AllAdminPage = ({ userRole }: { userRole: string | null }) => {
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);
  // Use a separate state to store the *unfiltered* list of admins
  const [originalAdmins, setOriginalAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAdminsCount, setTotalAdminsCount] = useState(0); // This will reflect filtered count now
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [showEditAdminDialog, setShowEditAdminDialog] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [editAdminName, setEditAdminName] = useState("");

  const [sortKey, setSortKey] = useState<keyof Admin | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const token = getAccessToken();
  const router = useRouter();

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  // Fetch ALL admins ONCE
  const fetchAllAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ApiResponse<AdminsData>>(
        `/admin?includeRelations=true` // Fetch all, client-side will filter
      );
      const data = response.data.data;
      setOriginalAdmins(data?.admins || []); // Store the full list
    } catch (error: any) {
      setOriginalAdmins([]);
      toast.error(error.message || "Failed to fetch admins. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies here, fetch once

  // Initial fetch when component mounts
  useEffect(() => {
    fetchAllAdmins();
  }, [fetchAllAdmins]);

  // This useMemo now handles all filtering, sorting, and pagination
  const filteredAndPaginatedAdmins = useMemo(() => {
    let currentAdmins = [...originalAdmins]; // Start with the full list

    // 1. Apply Search Filter
    if (searchQuery) {
      currentAdmins = currentAdmins.filter(
        (admin) =>
          admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 2. Apply Role Filter
    if (roleFilter !== "all") {
      currentAdmins = currentAdmins.filter(
        (admin) => admin.role === roleFilter
      );
    }

    // Update total count after filtering
    setTotalAdminsCount(currentAdmins.length);

    // 3. Apply Sorting
    if (sortKey) {
      currentAdmins.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (sortKey === "createdAt" || sortKey === "updatedAt") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }

    // 4. Apply Pagination
    const adminsPerPage = 10;
    const newTotalPages = Math.ceil(currentAdmins.length / adminsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    // Ensure currentPage doesn't exceed newTotalPages after filtering
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
    }

    const startIndex = (currentPage - 1) * adminsPerPage;
    const endIndex = startIndex + adminsPerPage;

    return currentAdmins.slice(startIndex, endIndex);
  }, [
    originalAdmins,
    searchQuery,
    roleFilter,
    sortKey,
    sortDirection,
    currentPage,
  ]); // All dependencies that affect filtering/sorting/pagination

  // Update `allAdmins` for rendering whenever filtered data changes
  useEffect(() => {
    setAllAdmins(filteredAndPaginatedAdmins);
  }, [filteredAndPaginatedAdmins]);

  const handleRefresh = () => {
    setSearchQuery(""); // Clear search on refresh
    setRoleFilter("all"); // Reset role filter on refresh
    setCurrentPage(1); // Go to first page on refresh
    fetchAllAdmins(); // Re-fetch the full list from API
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };

  const handleSort = (key: keyof Admin) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page on new sort
  };

  const renderSortIcon = (key: keyof Admin) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

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

  const handleViewDetails = (adminId: string) => {
    router.push(`/admin/${adminId}`);
  };

  const handleAddAdmin = async () => {
    setAddingAdmin(true);
    try {
      await axiosInstance.post("/admin", newAdmin);
      toast.success("Admin added successfully!");
      setShowAddAdminDialog(false);
      setNewAdmin({ name: "", email: "" });
      fetchAllAdmins(); // Re-fetch ALL admins to update the `originalAdmins` state
    } catch (error: any) {
      toast.error(
        `Failed to add admin: ${error.message || "An error occurred."}`
      );
      console.error("Add admin error:", error);
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleEditClick = (admin: Admin) => {
    setAdminToEdit(admin);
    setEditAdminName(admin.name);
    setShowEditAdminDialog(true);
  };

  const handleUpdateAdmin = async () => {
    if (!adminToEdit) return;

    setEditingAdmin(true);
    try {
      await axiosInstance.patch(`/admin/${adminToEdit.id}`, {
        name: editAdminName,
      });
      toast.info("Admin updated successfully!");
      setShowEditAdminDialog(false);
      setAdminToEdit(null);
      setEditAdminName("");
      fetchAllAdmins(); // Re-fetch ALL admins to update the `originalAdmins` state
    } catch (error: any) {
      toast.error(
        `Failed to update admin: ${error.message || "An error occurred."}`
      );
      console.error("Update admin error:", error);
    } finally {
      setEditingAdmin(false);
    }
  };

  const handleDeleteClick = (adminId: string) => {
    setAdminToDelete(adminId);
    setShowDeleteConfirmation(true);
  };

  const executeDelete = async () => {
    if (!adminToDelete) return;

    setDeletingAdmin(true);
    try {
      await axiosInstance.delete(`/admin/${adminToDelete}`);
      fetchAllAdmins(); // Re-fetch ALL admins to update the `originalAdmins` state
      toast.success("Admin deleted successfully!");
      setShowDeleteConfirmation(false);
      setAdminToDelete(null);
    } catch (error: any) {
      toast.error(
        `Failed to delete admin: ${error.message || "An error occurred."}`
      );
      console.error("Delete admin error:", error);
    } finally {
      setDeletingAdmin(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setAdminToDelete(null);
  };

  // Determine if the delete button should be disabled for a specific admin
  const isDeleteDisabled = useCallback(
    (admin: Admin) => {
      // Disable delete button if the admin's role is SUPER
      // Or if the admin is currently being deleted.
      return admin.role === "SUPER" || (deletingAdmin && adminToDelete === admin.id);
    },
    [deletingAdmin, adminToDelete]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Admin Management
                </h1>
                <p className="text-muted-foreground">
                  Manage and monitor administrator accounts with ease
                </p>
              </div>
            </div>
            <Dialog
              open={showAddAdminDialog}
              onOpenChange={setShowAddAdminDialog}
            >
              <DialogTrigger asChild>
                <Button className="hover:bg-primary hover:text-primary-foreground">
                  <Plus className="w-4 h-4" />
                  Add New Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Admin</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newAdmin.name}
                      onChange={(e) =>
                        setNewAdmin({ ...newAdmin, name: e.target.value })
                      }
                      maxLength={100} // Example: Max length for name
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) =>
                        setNewAdmin({ ...newAdmin, email: e.target.value })
                      }
                      maxLength={255} // Example: Max length for email
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddAdmin} disabled={addingAdmin}>
                    {addingAdmin ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : null}
                    Add Admin
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Stats Cards */}
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
                  Total Admins
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  // This now shows the count of currently filtered admins
                  <div className="text-2xl font-bold text-foreground">
                    {totalAdminsCount}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Controls: Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-auto flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search admins by name or email..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2"
                  aria-label="Search admins"
                  disabled={loading}
                  maxLength={100} // Example: Max length for search query
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    setCurrentPage(1); // Reset pagination on filter change
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-[200px] pl-10">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {Array.from(new Set(originalAdmins.map((a) => a.role))).map(
                      (role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="hover:bg-primary hover:text-primary-foreground"
                  aria-label="Refresh admin list"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Admins Table */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(10)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="ml-4">
                              <Skeleton className="h-4 w-24 mb-2" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
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
        ) : filteredAndPaginatedAdmins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm sm:text-base">No admins found</p>
                  <p className="text-muted-foreground mb-4">
                    Adjust your search or filters.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("name")}
                      >
                        Admin {renderSortIcon("name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("email")}
                      >
                        Email {renderSortIcon("email")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("role")}
                      >
                        Role {renderSortIcon("role")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created {renderSortIcon("createdAt")}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndPaginatedAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-foreground text-sm">
                                {admin.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              admin.role === "SUPER"
                                ? "bg-purple-100 hover:bg-purple-100 text-purple-800"
                                : "bg-blue-100 hover:bg-blue-100 text-blue-800"
                            }
                          >
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(admin.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(admin.id)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(admin)}
                              className="hover:text-primary hover:bg-primary/10 border-border"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(admin.id)}
                              disabled={isDeleteDisabled(admin)}
                              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                            >
                              {deletingAdmin && adminToDelete === admin.id ? (
                                <div className="flex items-center">
                                  <LoadingSpinner className="h-4 w-4 mr-1 text-destructive" />
                                  Deleting...
                                </div>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </>
                              )}
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
        {totalAdminsCount > 0 && ( // Only show pagination if there are filtered admins
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"
          >
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
              variant="outline"
              size="sm"
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm sm:text-base">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || loading}
              variant="outline"
              size="sm"
              aria-label="Next page"
            >
              Next
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trash2 className="inline-block mr-2 h-6 w-6 text-destructive" />
              Confirm Admin Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            Are you sure you want to permanently delete this admin? This action
            cannot be undone.
          </p>
          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={cancelDelete}
              disabled={deletingAdmin}
            >
              Cancel
            </Button>
            <Button
              onClick={executeDelete}
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

      {/* Edit Admin Modal */}
      <Dialog open={showEditAdminDialog} onOpenChange={setShowEditAdminDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
                className="col-span-3"
                maxLength={32}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                value={adminToEdit?.email || ""}
                disabled
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateAdmin} disabled={editingAdmin}>
              {editingAdmin ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllAdminPage;
