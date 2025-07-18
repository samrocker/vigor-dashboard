// ./src/components/Users/AllUserPage.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react"; // Added useCallback
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Calendar,
  Filter,
  RefreshCw,
  Info,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { ApiResponse, axiosInstance } from "@/lib/axios";

// Shadcn UI components
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
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export interface User {
  id: string;
  name: string;
  email: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AllUserPage = () => { // Renamed from AdminUserManagement for clarity, as per your file path
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deleted">("all");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<"soft" | "permanent" | null>(null);

  const [sortKey, setSortKey] = useState<keyof User | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const token = getAccessToken();
  const router = useRouter(); // Initialize useRouter

  // FIX: Added 'router' to the dependency array.
  // Also, ensuring token is present before fetch.
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAllUsers();
  }, [token, router]); // 'router' added here

  // useEffect for modal animation
  useEffect(() => {
    if (showDeleteConfirmation) {
      const timer = setTimeout(() => setIsModalOpen(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsModalOpen(false);
    }
  }, [showDeleteConfirmation]);

  // Memoize fetchUserNames to satisfy useEffect dependency, similar to orders page
  const fetchAllUsers = useCallback(async () => { // Wrapped in useCallback
    setLoading(true);
    try {
      const response = await axiosInstance.get<ApiResponse<UsersData>>(`/admin/user`);
      const data = response.data.data;
      setAllUsers(data?.users || []);
      setTotalUsersCount(data?.total || 0);
      setError(null);
    } catch (error: any) {
      setAllUsers([]);
      setError(error.message || "Failed to fetch users. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []); // No external dependencies, or if any, list them here.

  // FIX: Added 'fetchAllUsers' to the dependency array.
  useEffect(() => {
    fetchAllUsers();
  }, [currentPage, searchQuery, statusFilter, fetchAllUsers]); // 'fetchAllUsers' added here

  const filteredAndPaginatedUsers = useMemo(() => {
    let currentUsers = [...allUsers];

    if (searchQuery) {
      currentUsers = currentUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      currentUsers = currentUsers.filter((user) => {
        if (statusFilter === "active") {
          return !user.isDeleted;
        } else if (statusFilter === "deleted") {
          return user.isDeleted;
        }
        return true;
      });
    }

    if (sortKey) {
      currentUsers.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (sortKey === "createdAt" || sortKey === "updatedAt" || sortKey === "deletedAt") {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
        if (sortKey === "isDeleted") {
            return sortDirection === "asc" ? (aValue === bValue ? 0 : aValue ? 1 : -1) : (aValue === bValue ? 0 : aValue ? -1 : 1);
        }
        return 0;
      });
    }

    const usersPerPage = 10;
    const newTotalPages = Math.ceil(currentUsers.length / usersPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;

    return currentUsers.slice(startIndex, endIndex);
  }, [allUsers, searchQuery, statusFilter, sortKey, sortDirection, currentPage]);

  const handleRefresh = () => {
    fetchAllUsers();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as "all" | "active" | "deleted");
    setCurrentPage(1);
  };

  const handleSort = (key: keyof User) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: keyof User) => {
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

  const handleViewDetails = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirmation(true);
  };

  const executeDelete = async (type: "soft" | "permanent") => {
    if (!userToDelete) return;

    setDeletingUser(true);
    setDeleteActionType(type);
    try {
      const endpoint =
        type === "soft"
          ? `/admin/user/soft-delete/${userToDelete}`
          : `/admin/user/${userToDelete}`;
      await axiosInstance.delete(endpoint);
      fetchAllUsers();
      setError(null);
      toast.success(`User ${type === "soft" ? "soft-deleted" : "permanently deleted"} successfully!`);
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
      setDeleteActionType(null);
    } catch (error: any) {
      setError(error.message || "Failed to delete user. Please try again.");
      toast.error(`Failed to delete user: ${error.message || "An error occurred."}`);
      console.error("Delete user error:", error);
    } finally {
      setDeletingUser(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setUserToDelete(null);
    setDeleteActionType(null);
  };

  const activeUsersCount = allUsers.filter((u) => !u.isDeleted).length;
  const deletedUsersCount = allUsers.filter((u) => u.isDeleted).length;

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  User Management
                </h1>
                <p className="text-muted-foreground">
                  Manage and monitor user accounts with ease
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalUsersCount}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
              <User className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{activeUsersCount}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deleted Users
              </CardTitle>
              <Trash2 className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{deletedUsersCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls: Search and Filters */}
        <Card className="mb-8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2"
                aria-label="Search users"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={handleFilterChange}
                  className="pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Filter users by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
                aria-label="Refresh user list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="pt-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-destructive" />
              <p className="text-destructive-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="ml-3 text-muted-foreground">Loading users...</p>
          </div>
        ) : filteredAndPaginatedUsers.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm sm:text-base">No users found</p>
                <p className="text-muted-foreground mb-4">
                  Adjust your search or filters.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      User {renderSortIcon("name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("email")}
                    >
                      Email {renderSortIcon("email")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("isDeleted")}
                    >
                      Status {renderSortIcon("isDeleted")}
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
                  {filteredAndPaginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-foreground text-sm">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            user.isDeleted
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {user.isDeleted ? "Deleted" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(user.id)}
                            className="hover:text-primary hover:bg-primary/10 border-border"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={deletingUser && userToDelete === user.id}
                            className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                          >
                            {deletingUser && userToDelete === user.id ? (
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
        )}

        {/* Pagination */}
        {filteredAndPaginatedUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              variant="outline"
              size="sm"
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trash2 className="inline-block mr-2 h-6 w-6 text-destructive" />
              Confirm User Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            Are you sure you want to delete this user? Choose{" "}
            <strong className="font-semibold text-orange-500">Soft Delete</strong> to mark the user as inactive (reversible) or{" "}
            <strong className="font-semibold text-destructive">Permanent Delete</strong> to remove the user completely (irreversible).
          </p>
          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={cancelDelete}
              disabled={deletingUser}
            >
              Cancel
            </Button>
            <Button
              onClick={() => executeDelete("soft")}
              disabled={deletingUser && deleteActionType !== "soft"}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {deletingUser && deleteActionType === "soft" ? (
                <div className="flex items-center">
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Soft Deleting...
                </div>
              ) : (
                "Soft Delete"
              )}
            </Button>
            <Button
              onClick={() => executeDelete("permanent")}
              disabled={deletingUser && deleteActionType !== "permanent"}
              variant="destructive"
            >
              {deletingUser && deleteActionType === "permanent" ? (
                <div className="flex items-center">
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Permanently Deleting...
                </div>
              ) : (
                "Permanent Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllUserPage;