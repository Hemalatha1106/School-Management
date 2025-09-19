"use client"

import { useState, useEffect, useMemo, useCallback, Component, ReactNode } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2, KeyRound, Users, GraduationCap, Shield, Search, Heart, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import type { User } from "@/lib/auth-context"

// Types
interface Student {
  user: User
  school_class: string
}

interface Teacher {
  user: User
  profile?: { subject?: string }
}

type StudentsByClass = Record<string, Student[]>

interface ValidationError {
  field: string
  message: string
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class UserManagementErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UserManagement Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The user management component encountered an error.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left text-sm bg-gray-100 p-2 rounded">
                  <summary>Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <Button 
                onClick={() => this.setState({ hasError: false })}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Custom Hooks
function useOptimizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (item: T) => string[]
) {
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items

    const lowerSearchTerm = searchTerm.toLowerCase()

    return items.filter(item => {
      const fieldsToSearch = searchFields(item)
      return fieldsToSearch.some(field =>
        field.toLowerCase().includes(lowerSearchTerm)
      )
    })
  }, [items, searchTerm, searchFields])

  return filteredItems
}

function useUserManagement() {
  const { toast } = useToast()
  
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [otherUsers, setOtherUsers] = useState<User[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [studentsRes, teachersRes, usersRes] = await Promise.all([
        api.students.list(),
        api.teachers.list(),
        api.users.list(),
      ])

      if (!studentsRes.success || !teachersRes.success || !usersRes.success) {
        throw new Error("Failed to fetch all user types.")
      }

      setStudents(studentsRes.data as Student[])
      setTeachers(teachersRes.data as Teacher[])

      const studentUserIds = new Set((studentsRes.data as Student[]).map((s: Student) => s.user.id))
      const teacherUserIds = new Set((teachersRes.data as Teacher[]).map((t: Teacher) => t.user.id))
      setOtherUsers(
        (usersRes.data as User[]).filter(
          (u: User) => !studentUserIds.has(u.id) && !teacherUserIds.has(u.id)
        )
      )

    } catch (err: any) {
      setError(err.message)
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: "Please check your network connection and try again."
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const updateUserCredentials = useCallback(async (
    userId: string,
    payload: { username?: string; password?: string }
  ) => {
    try {
      const response = await api.admin.updateUser(parseInt(userId), payload)
      if (response.success) {
        toast({
          title: "Success",
          description: (response.data as any)?.message
        })
        await fetchAllUsers()
        return true
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message
      })
      return false
    }
  }, [toast, fetchAllUsers])

  const performHealthCheck = useCallback(async () => {
    try {
      const response = await api.health.check()
      if (response.success) {
        toast({
          title: "Health Check Successful",
          description: (response.data as any)?.message || "Server is running smoothly!",
        })
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Health Check Failed",
        description: error.message || "Unable to connect to server.",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchAllUsers()
  }, [fetchAllUsers])

  return {
    students,
    teachers,
    otherUsers,
    isLoading,
    error,
    fetchAllUsers,
    updateUserCredentials,
    performHealthCheck
  }
}

// Validation Functions
const validateCredentials = (username: string, password: string): ValidationError[] => {
  const errors: ValidationError[] = []
  
  if (username && username.length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters long' })
  }
  
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' })
  }
  
  if (password && password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' })
  }
  
  return errors
}

// Main Component
function UserManagementComponent() {
  const {
    students,
    teachers,
    otherUsers,
    isLoading,
    error,
    fetchAllUsers,
    updateUserCredentials,
    performHealthCheck
  } = useUserManagement()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // Search functionality with optimization
  const filteredTeachers = useOptimizedSearch(
    teachers,
    searchTerm,
    useCallback((teacher) => [
      `${teacher.user.first_name} ${teacher.user.last_name}`,
      teacher.user.username,
      teacher.profile?.subject || ''
    ], [])
  )

  const filteredOthers = useOptimizedSearch(
    otherUsers,
    searchTerm,
    useCallback((user) => [
      `${user.first_name} ${user.last_name}`,
      user.username
    ], [])
  )

  // Student grouping and filtering
  const studentsByClass = useMemo(() => {
    return students.reduce((acc, student) => {
      const className = student.school_class || "Unassigned"
      if (!acc[className]) acc[className] = []
      acc[className].push(student)
      return acc
    }, {} as StudentsByClass)
  }, [students])

  const getFilteredClassCount = useCallback((className: string) => {
    if (!studentsByClass[className]) return 0
    return studentsByClass[className].filter(s => 
      `${s.user.first_name} ${s.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).length
  }, [studentsByClass, searchTerm])

  const totalFilteredStudents = useMemo(() => {
    return Object.keys(studentsByClass).reduce((acc, className) => 
      acc + getFilteredClassCount(className), 0
    )
  }, [studentsByClass, getFilteredClassCount])

  const isSearchActive = searchTerm.trim() !== ""

  // Dialog handlers
  const handleOpenDialog = useCallback((user: User) => {
    setSelectedUser(user)
    setNewUsername(user.username)
    setNewPassword("")
    setValidationErrors([])
  }, [])

  const handleCloseDialog = useCallback(() => {
    setSelectedUser(null)
    setValidationErrors([])
  }, [])

  const handleCredentialsChange = useCallback(async () => {
    if (!selectedUser) return

    const payload: { username?: string; password?: string } = {}
    if (newUsername && newUsername !== selectedUser.username) payload.username = newUsername
    if (newPassword) payload.password = newPassword

    if (Object.keys(payload).length === 0) {
      setValidationErrors([{ field: 'general', message: 'No changes detected. Please update username or password.' }])
      return
    }

    // Validate inputs
    const errors = validateCredentials(payload.username || '', payload.password || '')
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setIsSubmitting(true)

    const success = await updateUserCredentials(selectedUser.id.toString(), payload)
    if (success) {
      handleCloseDialog()
    }
    
    setIsSubmitting(false)
  }, [selectedUser, newUsername, newPassword, updateUserCredentials, handleCloseDialog])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen-minus-header p-8 text-center text-gray-500">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <p className="mt-4 text-xl font-medium">Loading user data...</p>
        <p className="text-sm">This may take a moment to fetch all roles and classes.</p>
        <div role="status" aria-live="polite" className="sr-only">
          Loading user data, please wait...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen-minus-header p-8 text-center text-red-500">
        <XCircle className="h-12 w-12" />
        <p className="mt-4 text-xl font-medium">Failed to Load Users</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchAllUsers} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  const getValidationError = (field: string) => 
    validationErrors.find(error => error.field === field)?.message

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and credentials across the system</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-blue-500 shadow-md transition-shadow duration-300 hover:shadow-lg">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{students.length}</p>
              </div>
              <GraduationCap className="h-10 w-10 text-blue-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500 shadow-md transition-shadow duration-300 hover:shadow-lg">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Teachers</p>
                <p className="text-3xl font-bold text-green-600">{teachers.length}</p>
              </div>
              <Users className="h-10 w-10 text-green-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500 shadow-md transition-shadow duration-300 hover:shadow-lg">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Other Staff</p>
                <p className="text-3xl font-bold text-yellow-600">{otherUsers.length}</p>
              </div>
              <Shield className="h-10 w-10 text-yellow-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Credentials Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credentials for {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Update the username or password. Leave a field blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {getValidationError('general') && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {getValidationError('general')}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="new-username">Username</Label>
              <Input 
                id="new-username" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                className={getValidationError('username') ? 'border-red-500' : ''}
                aria-describedby={getValidationError('username') ? 'username-error' : undefined}
              />
              {getValidationError('username') && (
                <p id="username-error" className="text-sm text-red-600">
                  {getValidationError('username')}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Leave blank to keep current password"
                className={getValidationError('password') ? 'border-red-500' : ''}
                aria-describedby={getValidationError('password') ? 'password-error' : undefined}
              />
              {getValidationError('password') && (
                <p id="password-error" className="text-sm text-red-600">
                  {getValidationError('password')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleCredentialsChange} 
              disabled={isSubmitting} 
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User Account Management</CardTitle>
          <CardDescription>View all users grouped by role and manage their credentials.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 max-w-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500"
              aria-label="Search users by name or username"
            />
            {isSearchActive && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchTerm("")} 
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                aria-label="Clear search"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["user-directory", "students", "teachers"]} className="w-full">

            {/* User Directory Section - All Users */}
            <AccordionItem value="user-directory">
              <AccordionTrigger className="text-xl font-bold hover:no-underline">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-purple-500" />
                  User Directory ({students.length + teachers.length + otherUsers.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 border-l ml-3 space-y-2">
                {/* All Students */}
                {students
                  .filter(s =>
                    `${s.user.first_name} ${s.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.user.username.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ user, school_class }) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-blue-50 transition-colors duration-200 hover:bg-blue-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          <p className="text-xs text-blue-600">Student - Class {school_class}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Student
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                          aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                        >
                          <KeyRound className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* All Teachers */}
                {teachers
                  .filter(t =>
                    `${t.user.first_name} ${t.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.profile?.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ user, profile }) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-green-50 transition-colors duration-200 hover:bg-green-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          {profile?.subject && (
                            <p className="text-xs text-green-600">Teacher - {profile.subject}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Teacher
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                          aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                        >
                          <KeyRound className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* All Other Staff */}
                {otherUsers
                  .filter(u =>
                    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.username.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-yellow-50 transition-colors duration-200 hover:bg-yellow-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {user.role}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                          aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                        >
                          <KeyRound className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* No Results Message for User Directory */}
                {students.length === 0 && teachers.length === 0 && otherUsers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Students Section */}
            <AccordionItem value="students">
              <AccordionTrigger className="text-xl font-bold hover:no-underline">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                  Students ({totalFilteredStudents})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 border-l ml-3 space-y-4">
                {Object.keys(studentsByClass).sort().map(className => {
                  const classStudents = studentsByClass[className]
                  const filteredStudents = classStudents.filter(s =>
                    `${s.user.first_name} ${s.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.user.username.toLowerCase().includes(searchTerm.toLowerCase())
                  )

                  if (filteredStudents.length === 0 && isSearchActive) return null

                  return (
                    <div key={className}>
                      <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
                        Class {className} ({filteredStudents.length})
                      </h4>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(({ user }) => (
                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.first_name} {user.last_name}</p>
                                <p className="text-sm text-muted-foreground">{user.username}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                              aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                            >
                              <KeyRound className="h-4 w-4 mr-2" /> Edit
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No students found in this class matching your search.
                        </p>
                      )}
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>

            {/* Teachers Section */}
            <AccordionItem value="teachers">
              <AccordionTrigger className="text-xl font-bold hover:no-underline">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-green-500" />
                  Teachers ({filteredTeachers.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 border-l ml-3 space-y-2">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map(({ user, profile }) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          {profile?.subject && (
                            <p className="text-xs text-blue-600">{profile.subject}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenDialog(user)}
                        aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                      >
                        <KeyRound className="h-4 w-4 mr-2" /> Edit
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No teachers found matching your search.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* Other Staff Section */}
            <AccordionItem value="other-staff">
              <AccordionTrigger className="text-xl font-bold hover:no-underline">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-yellow-500" />
                  Other Staff ({filteredOthers.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 border-l ml-3 space-y-2">
                {filteredOthers.length > 0 ? (
                  filteredOthers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-gray-200 text-gray-800">
                          {user.role}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenDialog(user)}
                          aria-label={`Edit credentials for ${user.first_name} ${user.last_name}`}
                        >
                          <KeyRound className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No other staff found matching your search.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* No Results Message */}
          {isSearchActive && totalFilteredStudents === 0 && filteredTeachers.length === 0 && filteredOthers.length === 0 && (
            <div className="text-center text-muted-foreground mt-8 py-8 border-dashed border-2 rounded-lg">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold">No users found</h3>
              <p className="mt-1 text-sm">
                Your search for "<strong>{searchTerm}</strong>" did not match any users.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main Export with Error Boundary
export function UserManagement() {
  return (
    <UserManagementErrorBoundary>
      <UserManagementComponent />
    </UserManagementErrorBoundary>
  )
}