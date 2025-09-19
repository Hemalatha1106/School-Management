"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Mail,
  Trash2,
  UserCheck,
  UserX,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  BookOpen
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import * as XLSX from 'xlsx'

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
}

interface SchoolStats {
  total_users: number
  total_teachers: number
  total_students: number
  total_classes: number
  active_users: number
  monthly_payroll: number
  pending_payments: number
  paid_this_month: number
}

interface PrincipalUserManagementTabProps {
  users: User[]
  schoolStats: SchoolStats | null
  userSearchTerm: string
  setUserSearchTerm: (term: string) => void
  userRoleFilter: string
  setUserRoleFilter: (filter: string) => void
  userStatusFilter: string
  setUserStatusFilter: (filter: string) => void
  selectedUsers: number[]
  setSelectedUsers: (users: number[]) => void
  showAdvancedFilters: boolean
  setShowAdvancedFilters: (show: boolean) => void
  handleSelectUser: (userId: number, checked: boolean) => void
  handleSelectAllUsers: (checked: boolean) => void
  handleBulkActivateUsers: () => void
  handleBulkDeactivateUsers: () => void
  handleExportUsers: () => void
  handleViewUserDetails: (userId: number) => void
  handleEditUserDetails: (userId: number) => void
  handleSendMessage: (userId: number, userType: string) => void
  handleToggleUserStatus: (userId: number) => void
  handleDeleteUser: (userId: number) => void
  handleViewClassForUser: (userId: number) => void
  handleAddNewUser: () => void
}

export function PrincipalUserManagementTab({
  users,
  schoolStats,
  userSearchTerm,
  setUserSearchTerm,
  userRoleFilter,
  setUserRoleFilter,
  userStatusFilter,
  setUserStatusFilter,
  selectedUsers,
  setSelectedUsers,
  showAdvancedFilters,
  setShowAdvancedFilters,
  handleSelectUser,
  handleSelectAllUsers,
  handleBulkActivateUsers,
  handleBulkDeactivateUsers,
  handleExportUsers,
  handleViewUserDetails,
  handleEditUserDetails,
  handleSendMessage,
  handleToggleUserStatus,
  handleDeleteUser,
  handleViewClassForUser,
  handleAddNewUser
}: PrincipalUserManagementTabProps) {
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = userSearchTerm === "" ||
        user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearchTerm.toLowerCase())

      const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter
      const matchesStatus = userStatusFilter === "all" ||
        (userStatusFilter === "active" && user.is_active) ||
        (userStatusFilter === "inactive" && !user.is_active)

      return matchesSearch && matchesRole && matchesStatus
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Comprehensive user management with advanced filtering and bulk operations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportUsers}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700" onClick={handleAddNewUser}>
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {schoolStats?.total_users || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {schoolStats?.active_users || 0}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">
                  {schoolStats?.total_teachers || 0}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">
                  {schoolStats?.total_students || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, username..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="administrator">Administrators</SelectItem>
                  <SelectItem value="principal">Principals</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => {
                    setUserSearchTerm("")
                    setUserRoleFilter("all")
                    setUserStatusFilter("all")
                    setShowAdvancedFilters(false)
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkActivateUsers}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDeactivateUsers}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Directory
          </CardTitle>
          <CardDescription>
            Showing {getFilteredUsers().length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === getFilteredUsers().length && getFilteredUsers().length > 0}
                      onCheckedChange={handleSelectAllUsers}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredUsers().length > 0 ? (
                  getFilteredUsers().map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{user.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize ${
                            user.role === 'principal' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'administrator' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate" title={user.email}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? "secondary" : "outline"}
                          className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewUserDetails(user.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(user.role === 'student' || user.role === 'teacher') && (
                              <DropdownMenuItem onClick={() => handleViewClassForUser(user.id)}>
                                <BookOpen className="h-4 w-4 mr-2" />
                                View Class
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEditUserDetails(user.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendMessage(user.id, user.role)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user.id)}
                              className={user.is_active ? "text-red-600" : "text-green-600"}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No users found matching your criteria</p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUserSearchTerm("")
                            setUserRoleFilter("all")
                            setUserStatusFilter("all")
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}