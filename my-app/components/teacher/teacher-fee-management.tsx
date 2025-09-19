"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  Edit,
  Save,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  User,
  Clock,
  Loader2,
  Download,
  Upload,
  Eye,
  Trash2
} from "lucide-react"

// Teacher Fee Structure Interface
interface TeacherFeeStructure {
  id: number
  teacher_id: number
  teacher_name: string
  category: 'reimbursement' | 'professional_development' | 'equipment' | 'travel' | 'conference' | 'other'
  subcategory?: string
  amount: number
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  submission_date: string
  approval_date?: string
  payment_date?: string
  approved_by?: string
  receipt_url?: string
  notes?: string
  fiscal_year: string
}

// Fee Category Configuration
const FEE_CATEGORIES = {
  reimbursement: {
    label: 'Reimbursements',
    subcategories: ['Mileage', 'Supplies', 'Equipment', 'Software', 'Other'],
    maxAmount: 50000,
    requiresReceipt: true
  },
  professional_development: {
    label: 'Professional Development',
    subcategories: ['Conference', 'Workshop', 'Certification', 'Online Course', 'Membership'],
    maxAmount: 100000,
    requiresReceipt: true
  },
  equipment: {
    label: 'Equipment & Supplies',
    subcategories: ['Teaching Materials', 'Technology', 'Classroom Supplies', 'Lab Equipment'],
    maxAmount: 25000,
    requiresReceipt: true
  },
  travel: {
    label: 'Travel Expenses',
    subcategories: ['Transportation', 'Lodging', 'Meals', 'Registration'],
    maxAmount: 75000,
    requiresReceipt: true
  },
  conference: {
    label: 'Conference Attendance',
    subcategories: ['Registration Fee', 'Travel', 'Lodging', 'Materials'],
    maxAmount: 150000,
    requiresReceipt: true
  },
  other: {
    label: 'Other Expenses',
    subcategories: ['Miscellaneous'],
    maxAmount: 10000,
    requiresReceipt: false
  }
}

export default function TeacherFeeManagement() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [feeStructures, setFeeStructures] = useState<TeacherFeeStructure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFee, setEditingFee] = useState<TeacherFeeStructure | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [teachers, setTeachers] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState({
    teacher_id: '',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    receipt_url: '',
    notes: ''
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchFeeStructures()
    fetchTeachers()
  }, [])

  const fetchFeeStructures = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would call the API
      // For now, we'll use mock data
      const mockData: TeacherFeeStructure[] = [
        {
          id: 1,
          teacher_id: 1,
          teacher_name: 'John Doe',
          category: 'professional_development',
          subcategory: 'Conference',
          amount: 25000,
          description: 'Mathematics Education Conference attendance',
          status: 'approved',
          submission_date: '2024-09-01',
          approval_date: '2024-09-05',
          approved_by: 'Principal Smith',
          fiscal_year: '2024-2025',
          notes: 'Approved for professional development'
        },
        {
          id: 2,
          teacher_id: 2,
          teacher_name: 'Sarah Miller',
          category: 'reimbursement',
          subcategory: 'Equipment',
          amount: 15000,
          description: 'Interactive whiteboard markers and supplies',
          status: 'pending',
          submission_date: '2024-09-10',
          fiscal_year: '2024-2025'
        },
        {
          id: 3,
          teacher_id: 3,
          teacher_name: 'Robert Johnson',
          category: 'travel',
          subcategory: 'Transportation',
          amount: 8500,
          description: 'Bus fare for field trip supervision',
          status: 'paid',
          submission_date: '2024-08-15',
          approval_date: '2024-08-20',
          payment_date: '2024-08-25',
          approved_by: 'Principal Smith',
          fiscal_year: '2024-2025'
        }
      ]
      setFeeStructures(mockData)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load fee structures"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await api.users.list()
      if (response.success && Array.isArray(response.data)) {
        const teacherUsers = response.data.filter((user: any) => user.role === 'teacher')
        setTeachers(teacherUsers)
      }
    } catch (error: any) {
      console.error('Failed to fetch teachers:', error)
    }
  }

  const handleSubmitFee = async () => {
    if (!formData.teacher_id || !formData.category || !formData.amount || !formData.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields"
      })
      return
    }

    const amount = parseFloat(formData.amount)
    const categoryConfig = FEE_CATEGORIES[formData.category as keyof typeof FEE_CATEGORIES]

    if (amount > categoryConfig.maxAmount) {
      toast({
        variant: "destructive",
        title: "Amount Exceeds Limit",
        description: `Maximum amount for ${categoryConfig.label} is ₹${categoryConfig.maxAmount.toLocaleString()}`
      })
      return
    }

    try {
      const teacher = teachers.find(t => t.id.toString() === formData.teacher_id)

      const newFee: TeacherFeeStructure = {
        id: Date.now(), // Mock ID
        teacher_id: parseInt(formData.teacher_id),
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher',
        category: formData.category as any,
        subcategory: formData.subcategory,
        amount: amount,
        description: formData.description,
        status: 'pending',
        submission_date: new Date().toISOString().split('T')[0],
        fiscal_year: '2024-2025',
        receipt_url: formData.receipt_url,
        notes: formData.notes
      }

      // In a real implementation, this would make an API call
      setFeeStructures(prev => [...prev, newFee])

      // Reset form
      setFormData({
        teacher_id: '',
        category: '',
        subcategory: '',
        amount: '',
        description: '',
        receipt_url: '',
        notes: ''
      })
      setShowAddForm(false)

      toast({
        title: "Fee Request Submitted",
        description: "Your fee reimbursement request has been submitted for approval"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit fee request"
      })
    }
  }

  const handleApproveFee = async (feeId: number) => {
    try {
      setFeeStructures(prev =>
        prev.map(fee =>
          fee.id === feeId
            ? {
                ...fee,
                status: 'approved' as const,
                approval_date: new Date().toISOString().split('T')[0],
                approved_by: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'System'
              }
            : fee
        )
      )

      toast({
        title: "Fee Approved",
        description: "Fee request has been approved successfully"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve fee"
      })
    }
  }

  const handleRejectFee = async (feeId: number) => {
    try {
      setFeeStructures(prev =>
        prev.map(fee =>
          fee.id === feeId
            ? { ...fee, status: 'rejected' as const }
            : fee
        )
      )

      toast({
        title: "Fee Rejected",
        description: "Fee request has been rejected"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject fee"
      })
    }
  }

  const handleProcessPayment = async (feeId: number) => {
    try {
      setFeeStructures(prev =>
        prev.map(fee =>
          fee.id === feeId
            ? {
                ...fee,
                status: 'paid' as const,
                payment_date: new Date().toISOString().split('T')[0]
              }
            : fee
        )
      )

      toast({
        title: "Payment Processed",
        description: "Fee payment has been processed successfully"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process payment"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      approved: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
      rejected: { variant: 'destructive' as const, className: '' },
      paid: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800' }
    }

    return (
      <Badge variant={statusConfig[status as keyof typeof statusConfig]?.variant} className={statusConfig[status as keyof typeof statusConfig]?.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTotalByStatus = (status: string) => {
    return feeStructures
      .filter(fee => fee.status === status)
      .reduce((sum, fee) => sum + fee.amount, 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading teacher fee management...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teacher Fee Management</h2>
          <p className="text-muted-foreground">Manage reimbursements and professional development expenses</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Submit Fee Request
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-600">₹{getTotalByStatus('pending').toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-blue-600">₹{getTotalByStatus('approved').toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{getTotalByStatus('paid').toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{feeStructures.length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Requests</CardTitle>
          <CardDescription>All teacher fee requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeStructures.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.teacher_name}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{FEE_CATEGORIES[fee.category]?.label}</div>
                      {fee.subcategory && <div className="text-sm text-muted-foreground">{fee.subcategory}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">₹{fee.amount.toLocaleString()}</TableCell>
                  <TableCell className="max-w-xs truncate" title={fee.description}>
                    {fee.description}
                  </TableCell>
                  <TableCell>{getStatusBadge(fee.status)}</TableCell>
                  <TableCell>{new Date(fee.submission_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {fee.status === 'pending' && currentUser?.role === 'principal' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveFee(fee.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectFee(fee.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {fee.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcessPayment(fee.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Fee Request Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Fee Request</DialogTitle>
            <DialogDescription>
              Submit a new fee reimbursement or professional development request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Teacher</Label>
              <Select value={formData.teacher_id} onValueChange={(value) => setFormData({...formData, teacher_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({...formData, category: value, subcategory: ''})
                  setSelectedCategory(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEE_CATEGORIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div>
                <Label>Subcategory</Label>
                <Select value={formData.subcategory} onValueChange={(value) => setFormData({...formData, subcategory: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_CATEGORIES[selectedCategory as keyof typeof FEE_CATEGORIES]?.subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="Enter amount"
              />
              {selectedCategory && (
                <p className="text-sm text-muted-foreground mt-1">
                  Max: ₹{FEE_CATEGORIES[selectedCategory as keyof typeof FEE_CATEGORIES]?.maxAmount.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the expense..."
                rows={3}
              />
            </div>

            <div>
              <Label>Receipt URL (Optional)</Label>
              <Input
                value={formData.receipt_url}
                onChange={(e) => setFormData({...formData, receipt_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFee} className="bg-green-600 hover:bg-green-700">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}