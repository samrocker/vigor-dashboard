// ./src/components/Users/AllUserPage.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Calendar,
  Filter, // Keep Filter icon for the dropdown
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
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// Import Shadcn Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean; // true if active, false if soft-deleted
  deletedAt: string | null; // null if active, timestamp if soft-deleted
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

const AllUserPage = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null); // Removed error state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "deleted"
  >("all");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // This state isn't directly used for opening the dialog
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<
    "soft" | "permanent" | "recover" | null
  >(null);

  const [sortKey, setSortKey] = useState<keyof User | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const token = getAccessToken();
  const router = useRouter();

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ApiResponse<UsersData>>(
        `/admin/user`
      );
      const data = response.data.data;
      setAllUsers(data?.users || []);
      setTotalUsersCount(data?.total || 0);
      // setError(null); // Removed error state update
    } catch (error: any) {
      setAllUsers([]);
      // setError(error.message || "Failed to fetch users. Please try again."); // Removed error state update
      toast.error("Failed to fetch users. Please try again."); // Display error using toast
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      setLoading(false);
      return;
    }
    fetchAllUsers();
  }, [token, router, fetchAllUsers]);

  // This useEffect ensures the Dialog opens when showDeleteConfirmation is true
  useEffect(() => {
    if (showDeleteConfirmation) {
      // setIsModalOpen(true); // No longer strictly needed as Dialog 'open' prop handles it
    } else {
      // setIsModalOpen(false); // No longer strictly needed
    }
  }, [showDeleteConfirmation]);

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
          return user.isActive; // User is active if isActive is true
        } else if (statusFilter === "deleted") {
          return !user.isActive; // User is soft-deleted if isActive is false
        }
        return true;
      });
    }

    if (sortKey) {
      currentUsers.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          // Handle date sorting explicitly
          if (
            sortKey === "createdAt" ||
            sortKey === "updatedAt" ||
            sortKey === "deletedAt"
          ) {
            const dateA = new Date(aValue).getTime();
            const dateB = new Date(bValue).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
          }
          // Default string comparison for name, email, etc.
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        // Handle boolean sorting for isActive
        if (sortKey === "isActive") {
          // true comes after false for asc, false comes after true for desc
          return sortDirection === "asc"
            ? aValue === bValue
              ? 0
              : aValue
              ? -1
              : 1
            : aValue === bValue
            ? 0
            : aValue
            ? 1
            : -1;
        }
        return 0; // Should not happen for specified sort keys
      });
    }

    const usersPerPage = 10;
    const newTotalPages = Math.ceil(currentUsers.length / usersPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;

    return currentUsers.slice(startIndex, endIndex);
  }, [
    allUsers,
    searchQuery,
    statusFilter,
    sortKey,
    sortDirection,
    currentPage,
  ]);

  const executeRecover = async () => {
    if (!userToDelete) return;

    setDeletingUser(true);
    setDeleteActionType("recover");
    try {
      await axiosInstance.post(`/admin/user/recover/${userToDelete}`);
      fetchAllUsers();
      toast.success("User recovered successfully!");
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
      setDeleteActionType(null);
    } catch (error: any) {
      toast.error(
        `Failed to recover user: ${error.message || "An error occurred."}`
      );
      console.error("Recover user error:", error);
    } finally {
      setDeletingUser(false);
    }
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
    setSortKey("createdAt");
    setSortDirection("desc");
    fetchAllUsers();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Modified handler to work with Shadcn Select's onValueChange
  const handleFilterChange = (value: "all" | "active" | "deleted") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof User) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
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
      // setError(null); // Removed error state update
      toast.success(
        `User ${
          type === "soft" ? "soft-deleted" : "permanently deleted"
        } successfully!`
      );
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
      setDeleteActionType(null);
    } catch (error: any) {
      // setError(error.message || "Failed to delete user. Please try again."); // Removed error state update
      toast.error(
        `Failed to delete user: ${error.message || "An error occurred."}`
      );
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

  const activeUsersCount = allUsers.filter((u) => u.isActive).length;
  const deletedUsersCount = allUsers.filter((u) => !u.isActive).length;

  return (
    <div className="min-h-screen bg-background">
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
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  User Management
                </h1>
                <span className="text-muted-foreground">
                  Manage and monitor user accounts with ease
                </span>
              </div>
            </div>
            {/* You had a Plus button here earlier, but it's commented out in your provided code. 
        If you need an 'Add User' button, uncomment it.
      <Button
       onClick={() => {
        // Handle add user logic, e.g., router.push("/users/new");
        toast.info("Add User functionality not yet implemented.");
       }}
       disabled={loading}
      >
       <Plus className="h-4 w-4 mr-2" />
       Add User
      </Button> 
      */}
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  Total Users
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {totalUsersCount}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Users
                </CardTitle>
                <User className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-emerald-600">
                    {activeUsersCount}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Deleted Users
                </CardTitle>
                <Trash2 className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-destructive">
                    {deletedUsersCount}
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
          transition={{ delay: 0.25, duration: 0.5 }}
        >
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
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Shadcn Select for Status Filter */}
                <div className="relative w-full sm:w-[180px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Select
                    value={statusFilter}
                    onValueChange={handleFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full pl-10">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg bg-popover">
                      <SelectItem value="all" className="hover:bg-primary">
                        All
                      </SelectItem>
                      <SelectItem value="active" className="hover:bg-primary">
                        Active
                      </SelectItem>
                      <SelectItem value="deleted" className="hover:bg-primary">
                        Deleted
                      </SelectItem>

                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="hover:bg-primary hover:text-primary-foreground"
                  aria-label="Refresh user list"
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

        {/* Error Message - Removed from UI, now handled by toast */}
        {/* {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-destructive bg-destructive/10 mb-6">
              <CardContent className="pt-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-destructive" />
                <p className="text-destructive-foreground">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )} */}

        {/* Users Table */}
        {loading && !allUsers.length ? ( // Modified condition for skeleton loader
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredAndPaginatedUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
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
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
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
                        onClick={() => handleSort("isActive")}
                      >
                        Status {renderSortIcon("isActive")}
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
                            className={
                              user.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {user.isActive ? "Active" : "Inactive"}
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
                              disabled={
                                deletingUser && userToDelete === user.id
                              }
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
          </motion.div>
        )}

        {/* Pagination */}
        {filteredAndPaginatedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
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
      </div>

      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trash2 className="inline-block mr-2 h-6 w-6 text-destructive" />
              {(() => {
                const selectedUser = allUsers.find(
                  (user) => user.id === userToDelete
                );
                return selectedUser?.isActive
                  ? "Confirm User Deletion"
                  : "User Actions";
              })()}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const selectedUser = allUsers.find(
              (user) => user.id === userToDelete
            );
            const isUserActive = selectedUser?.isActive;

            return (
              <>
                <p className="text-muted-foreground mb-4">
                  {isUserActive ? (
                    <>
                      Are you sure you want to delete this user? Choose{" "}
                      <strong className="font-semibold text-orange-500">
                        Soft Delete
                      </strong>{" "}
                      to mark the user as inactive (reversible) or{" "}
                      <strong className="font-semibold text-destructive">
                        Permanent Delete
                      </strong>{" "}
                      to remove the user completely (irreversible).
                    </>
                  ) : (
                    <>
                      This user is currently inactive. You can{" "}
                      <strong className="font-semibold text-green-600">
                        Recover
                      </strong>{" "}
                      the user to reactivate their account or{" "}
                      <strong className="font-semibold text-destructive">
                        Permanently Delete
                      </strong>{" "}
                      to remove them completely (irreversible).
                    </>
                  )}
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
                  {isUserActive ? (
                    <Button
                      onClick={() => executeDelete("soft")}
                      disabled={deletingUser && deleteActionType !== "soft"}
                      className="bg-orange-500 text-white hover:bg-orange-600"
                    >
                      {deletingUser && deleteActionType === "soft" ? (
                        <div className="flex items-center">
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          deactivating user...
                        </div>
                      ) : (
                        "deactivate User"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={executeRecover}
                      disabled={deletingUser && deleteActionType !== "recover"}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {deletingUser && deleteActionType === "recover" ? (
                        <div className="flex items-center">
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Activating User...
                        </div>
                      ) : (
                        "Activate User"
                      )}
                    </Button>
                  )}
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
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllUserPage;
