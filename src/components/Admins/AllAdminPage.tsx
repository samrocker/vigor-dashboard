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
  Filter,
  RefreshCw,
  Info,
  ArrowUp,
  ArrowDown,
  Eye,
  ShieldHalf,
} from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  createAdmin,
  deleteAdmin,
  getAllAdmins,
  updateAdmin,
} from "@/lib/admin";
import { Admin, AllAdminsResponse } from "@/types/schemas/admin";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

const AllAdminPage = () => {
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAdminsCount, setTotalAdminsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "SUPER" | "SUB">("all");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  const [sortKey, setSortKey] = useState<keyof Admin | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [editedAdminName, setEditedAdminName] = useState("");

  const { toast } = useToast();
  const router = useRouter();

  const fetchAllAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllAdmins();
      const data = response.data;
      setAllAdmins(data?.admins || []);
      setTotalAdminsCount(data?.total || 0);
      setError(null);
    } catch (error: any) {
      setAllAdmins([]);
      setError(error.message || "Failed to fetch admins. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to fetch admins.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllAdmins();
  }, [currentPage, searchQuery, roleFilter, fetchAllAdmins]);

  const filteredAndPaginatedAdmins = useMemo(() => {
    let currentAdmins = [...allAdmins];

    if (searchQuery) {
      currentAdmins = currentAdmins.filter(
        (admin) =>
          admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      currentAdmins = currentAdmins.filter(
        (admin) => admin.role === roleFilter
      );
    }

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

    const adminsPerPage = 10;
    const newTotalPages = Math.ceil(currentAdmins.length / adminsPerPage);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

    const startIndex = (currentPage - 1) * adminsPerPage;
    const endIndex = startIndex + adminsPerPage;

    return currentAdmins.slice(startIndex, endIndex);
  }, [allAdmins, searchQuery, roleFilter, sortKey, sortDirection, currentPage]);

  const handleRefresh = () => {
    fetchAllAdmins();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as "all" | "SUPER" | "SUB");
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Admin) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
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
    return format(new Date(dateString), "PPP");
  };

  const handleViewDetails = (adminId: string) => {
    router.push(`/admin/${adminId}`);
  };

  const handleDeleteClick = (adminId: string) => {
    setAdminToDelete(adminId);
    setShowDeleteConfirmation(true);
  };

  const executeDelete = async () => {
    if (!adminToDelete) return;

    setDeletingAdmin(true);
    try {
      await deleteAdmin(adminToDelete);
      fetchAllAdmins();
      setError(null);
      toast({
        title: "Success",
        description: "Admin deleted successfully!",
      });
      setShowDeleteConfirmation(false);
      setAdminToDelete(null);
    } catch (error: any) {
      setError(error.message || "Failed to delete admin. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin.",
        variant: "destructive",
      });
      console.error("Delete admin error:", error);
    } finally {
      setDeletingAdmin(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      await createAdmin({ email: newAdminEmail, name: newAdminName });
      toast({
        title: "Success",
        description: "Admin created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewAdminEmail("");
      setNewAdminName("");
      fetchAllAdmins();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create admin.",
        variant: "destructive",
      });
    }
  };

  const handleEditAdmin = async () => {
    if (currentAdmin) {
      try {
        await updateAdmin(currentAdmin.id, { name: editedAdminName });
        toast({
          title: "Success",
          description: "Admin updated successfully.",
        });
        setIsEditDialogOpen(false);
        setCurrentAdmin(null);
        setEditedAdminName("");
        fetchAllAdmins();
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to update admin.",
          variant: "destructive",
        });
      }
    }
  };

  const superAdminsCount = allAdmins.filter((a) => a.role === "SUPER").length;
  const subAdminsCount = allAdmins.filter((a) => a.role === "SUB").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <ShieldHalf className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Admin Management
                </h1>
                <p className="text-muted-foreground">
                  Manage and monitor administrator accounts
                </p>
              </div>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Admin</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the new admin.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
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
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateAdmin}>
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Admins
              </CardTitle>
              <ShieldHalf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalAdminsCount}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Super Admins
              </CardTitle>
              <ShieldHalf className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {superAdminsCount}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sub Admins
              </CardTitle>
              <ShieldHalf className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {subAdminsCount}
              </div>
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
                placeholder="Search admins by name or email..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2"
                aria-label="Search admins"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={roleFilter}
                  onChange={handleFilterChange}
                  className="pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Filter admins by role"
                >
                  <option value="all">All Roles</option>
                  <option value="SUPER">SUPER</option>
                  <option value="SUB">SUB</option>
                </select>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
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

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="pt-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-destructive" />
              <p className="text-destructive-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Admins Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="ml-3 text-muted-foreground">Loading admins...</p>
          </div>
        ) : filteredAndPaginatedAdmins.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <ShieldHalf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm sm:text-base">No admins found</p>
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
                          className={`${
                            admin.role === "SUPER"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }`}
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(admin.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <DotsHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/${admin.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentAdmin(admin);
                                setEditedAdminName(admin.name);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(admin.id)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {filteredAndPaginatedAdmins.length > 0 && (
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
          </div>
        )}
      </div>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Edit the details of the admin.
            </DialogDescription>
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
            <Button type="submit" onClick={handleEditAdmin}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Modal */}
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
            Are you sure you want to delete this admin? This action cannot be
            undone.
          </p>
          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
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
    </div>
  );
};

export default AllAdminPage;
