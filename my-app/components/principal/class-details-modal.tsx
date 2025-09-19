"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  User,
  FileText,
  BarChart3,
  Download,
  Edit,
  Save,
  Loader2,
  DollarSign,
  Eye
} from "lucide-react"
import { FeeDetailsModal } from "../student/fee-details-modal"

// EditFeeModal Component
interface EditFeeModalProps {
  isOpen: boolean
  onClose: () => void
  classId?: number
  className?: string
  onUpdate?: () => void
}

function EditFeeModal({ isOpen, onClose, classId, className, onUpdate }: EditFeeModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [feeData, setFeeData] = useState({
    tuitionFee: '',
    examFee: '',
    libraryFee: '',
    sportsFee: '',
    transportationFee: '',
    dueDate: '',
    lateFee: '',
    discount: ''
  })

  // Load existing fee data when modal opens
  useEffect(() => {
    if (isOpen && classId) {
      loadFeeData()
    }
  }, [isOpen, classId])

  const loadFeeData = async () => {
    setIsLoading(true)
    try {
      // Mock data - in real app, this would fetch from API
      setFeeData({
        tuitionFee: '2500',
        examFee: '500',
        libraryFee: '200',
        sportsFee: '300',
        transportationFee: '400',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lateFee: '100',
        discount: '0'
      })
    } catch (error) {
      console.error('Error loading fee data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate form before saving
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors in the form before saving."
      })
      return
    }

    setIsLoading(true)
    try {
      // Mock API call - in real app, this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success dialog instead of just toast
      setShowSuccessDialog(true)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update fee details. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSave = () => {
    setShowSuccessDialog(false)
    onUpdate?.()
    onClose()
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // Validate fee amounts
    const feeFields = ['tuitionFee', 'examFee', 'libraryFee', 'sportsFee', 'transportationFee', 'lateFee', 'discount']
    feeFields.forEach(field => {
      const value = parseFloat(feeData[field as keyof typeof feeData] || '0')
      if (isNaN(value)) {
        errors[field] = 'Please enter a valid number'
      } else if (value < 0) {
        errors[field] = 'Amount cannot be negative'
      } else if (value > 50000) {
        errors[field] = 'Amount cannot exceed ₹50,000'
      }
    })

    // Validate due date
    if (!feeData.dueDate) {
      errors.dueDate = 'Due date is required'
    } else {
      const dueDate = new Date(feeData.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (dueDate < today) {
        errors.dueDate = 'Due date cannot be in the past'
      }
    }

    // Validate discount doesn't exceed total fees
    const totalFees = [
      parseFloat(feeData.tuitionFee || '0'),
      parseFloat(feeData.examFee || '0'),
      parseFloat(feeData.libraryFee || '0'),
      parseFloat(feeData.sportsFee || '0'),
      parseFloat(feeData.transportationFee || '0')
    ].reduce((sum, fee) => sum + fee, 0)

    const discount = parseFloat(feeData.discount || '0')
    if (discount > totalFees) {
      errors.discount = 'Discount cannot exceed total fees'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const calculateTotal = () => {
    const fees = [
      parseFloat(feeData.tuitionFee || '0'),
      parseFloat(feeData.examFee || '0'),
      parseFloat(feeData.libraryFee || '0'),
      parseFloat(feeData.sportsFee || '0'),
      parseFloat(feeData.transportationFee || '0')
    ]
    const subtotal = fees.reduce((sum, fee) => sum + fee, 0)
    const discount = parseFloat(feeData.discount || '0')
    return Math.max(0, subtotal - discount)
  }

  if (isLoading && !feeData.tuitionFee) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading fee details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Fee Details - {className}
            </DialogTitle>
            <DialogDescription>
              Update fee structure and payment details for this class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Fee Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fee Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tuitionFee">Tuition Fee (₹)</Label>
                    <Input
                      id="tuitionFee"
                      type="number"
                      placeholder="0"
                      value={feeData.tuitionFee}
                      onChange={(e) => {
                        setFeeData({...feeData, tuitionFee: e.target.value})
                        if (validationErrors.tuitionFee) {
                          setValidationErrors({...validationErrors, tuitionFee: ''})
                        }
                      }}
                      className={validationErrors.tuitionFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.tuitionFee && (
                      <p className="text-sm text-red-600">{validationErrors.tuitionFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examFee">Exam Fee (₹)</Label>
                    <Input
                      id="examFee"
                      type="number"
                      placeholder="0"
                      value={feeData.examFee}
                      onChange={(e) => {
                        setFeeData({...feeData, examFee: e.target.value})
                        if (validationErrors.examFee) {
                          setValidationErrors({...validationErrors, examFee: ''})
                        }
                      }}
                      className={validationErrors.examFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.examFee && (
                      <p className="text-sm text-red-600">{validationErrors.examFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="libraryFee">Library Fee (₹)</Label>
                    <Input
                      id="libraryFee"
                      type="number"
                      placeholder="0"
                      value={feeData.libraryFee}
                      onChange={(e) => {
                        setFeeData({...feeData, libraryFee: e.target.value})
                        if (validationErrors.libraryFee) {
                          setValidationErrors({...validationErrors, libraryFee: ''})
                        }
                      }}
                      className={validationErrors.libraryFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.libraryFee && (
                      <p className="text-sm text-red-600">{validationErrors.libraryFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sportsFee">Sports Fee (₹)</Label>
                    <Input
                      id="sportsFee"
                      type="number"
                      placeholder="0"
                      value={feeData.sportsFee}
                      onChange={(e) => {
                        setFeeData({...feeData, sportsFee: e.target.value})
                        if (validationErrors.sportsFee) {
                          setValidationErrors({...validationErrors, sportsFee: ''})
                        }
                      }}
                      className={validationErrors.sportsFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.sportsFee && (
                      <p className="text-sm text-red-600">{validationErrors.sportsFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transportationFee">Transportation Fee (₹)</Label>
                    <Input
                      id="transportationFee"
                      type="number"
                      placeholder="0"
                      value={feeData.transportationFee}
                      onChange={(e) => {
                        setFeeData({...feeData, transportationFee: e.target.value})
                        if (validationErrors.transportationFee) {
                          setValidationErrors({...validationErrors, transportationFee: ''})
                        }
                      }}
                      className={validationErrors.transportationFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.transportationFee && (
                      <p className="text-sm text-red-600">{validationErrors.transportationFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (₹)</Label>
                    <Input
                      id="discount"
                      type="number"
                      placeholder="0"
                      value={feeData.discount}
                      onChange={(e) => {
                        setFeeData({...feeData, discount: e.target.value})
                        if (validationErrors.discount) {
                          setValidationErrors({...validationErrors, discount: ''})
                        }
                      }}
                      className={validationErrors.discount ? 'border-red-500' : ''}
                    />
                    {validationErrors.discount && (
                      <p className="text-sm text-red-600">{validationErrors.discount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={feeData.dueDate}
                      onChange={(e) => {
                        setFeeData({...feeData, dueDate: e.target.value})
                        if (validationErrors.dueDate) {
                          setValidationErrors({...validationErrors, dueDate: ''})
                        }
                      }}
                      className={validationErrors.dueDate ? 'border-red-500' : ''}
                    />
                    {validationErrors.dueDate && (
                      <p className="text-sm text-red-600">{validationErrors.dueDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFee">Late Fee (₹)</Label>
                    <Input
                      id="lateFee"
                      type="number"
                      placeholder="0"
                      value={feeData.lateFee}
                      onChange={(e) => {
                        setFeeData({...feeData, lateFee: e.target.value})
                        if (validationErrors.lateFee) {
                          setValidationErrors({...validationErrors, lateFee: ''})
                        }
                      }}
                      className={validationErrors.lateFee ? 'border-red-500' : ''}
                    />
                    {validationErrors.lateFee && (
                      <p className="text-sm text-red-600">{validationErrors.lateFee}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Summary */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-green-800">Total Fee Amount</p>
                    <p className="text-xs text-green-600">After discount</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-800">₹{calculateTotal().toLocaleString()}</p>
                    <p className="text-xs text-green-600">Per student</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Fee Details Updated Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              The fee details for {className} have been saved to the database successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-800">
                    ₹{calculateTotal().toLocaleString()}
                  </div>
                  <p className="text-sm text-green-700">New Total Fee Amount</p>
                  <div className="text-xs text-green-600">
                    Updated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">What's Next:</p>
                  <ul className="text-blue-700 mt-1 space-y-1">
                    <li>• Students will see updated fee amounts</li>
                    <li>• Payment due date has been set</li>
                    <li>• All changes are saved to database</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleConfirmSave} className="w-full bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Class Details Interface
interface ClassDetails {
  id: number
  name: string
  grade: string
  section: string
  teacher: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  students: {
    id: number
    user: {
      id: number
      first_name: string
      last_name: string
      email: string
    }
    enrollment_date: string
    attendance_rate: number
    current_gpa: number
  }[]
  subjects: {
    id: number
    name: string
    teacher: string
    schedule: string
  }[]
  schedule: {
    day: string
    periods: {
      subject: string
      teacher: string
      time: string
    }[]
  }[]
  statistics: {
    total_students: number
    average_attendance: number
    average_gpa: number
    subject_performance: { [key: string]: number }
    enrollment_trends: { month: string, count: number }[]
  }
}

interface ClassDetailsModalProps {
  classId: number | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export default function ClassDetailsModal({
  classId,
  isOpen,
  onClose,
  onUpdate
}: ClassDetailsModalProps) {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [showFeeDetailsModal, setShowFeeDetailsModal] = useState(false)
  const [showEditFeeModal, setShowEditFeeModal] = useState(false)

  // Load class data when modal opens
  useEffect(() => {
    if (classId && isOpen) {
      loadClassDetails()
    }
  }, [classId, isOpen])

  const loadClassDetails = async () => {
    setIsLoading(true)
    try {
      // Mock data for demonstration
      const mockClassDetails: ClassDetails = {
        id: classId || 1,
        name: `${Math.floor(Math.random() * 10) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
        grade: `${Math.floor(Math.random() * 10) + 1}`,
        section: String.fromCharCode(65 + Math.floor(Math.random() * 3)),
        teacher: {
          id: 1,
          first_name: "Sarah",
          last_name: "Miller",
          email: "sarah.miller@school.com"
        },
        students: Array.from({ length: Math.floor(Math.random() * 10) + 20 }, (_, i) => ({
          id: 100 + i,
          user: {
            id: 100 + i,
            first_name: ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Helen", "Ian", "Julia"][i % 10],
            last_name: ["Johnson", "Smith", "Brown", "Davis", "Wilson", "Garcia", "Martinez", "Anderson", "Taylor", "Thomas"][i % 10],
            email: `student${i + 1}@school.com`
          },
          enrollment_date: "2024-01-15",
          attendance_rate: 85 + Math.random() * 15,
          current_gpa: 3.0 + Math.random() * 1.0
        })),
        subjects: [
          { id: 1, name: "Mathematics", teacher: "Mr. Johnson", schedule: "Mon, Wed, Fri 9:00-10:00" },
          { id: 2, name: "English", teacher: "Ms. Davis", schedule: "Tue, Thu 10:00-11:00" },
          { id: 3, name: "Science", teacher: "Dr. Wilson", schedule: "Mon, Wed 11:00-12:00" },
          { id: 4, name: "History", teacher: "Mrs. Brown", schedule: "Tue, Fri 9:00-10:00" },
          { id: 5, name: "Physical Education", teacher: "Mr. Taylor", schedule: "Wed, Fri 2:00-3:00" }
        ],
        schedule: [
          {
            day: "Monday",
            periods: [
              { subject: "Mathematics", teacher: "Mr. Johnson", time: "9:00-10:00" },
              { subject: "Science", teacher: "Dr. Wilson", time: "10:00-11:00" },
              { subject: "English", teacher: "Ms. Davis", time: "11:00-12:00" }
            ]
          },
          {
            day: "Tuesday",
            periods: [
              { subject: "English", teacher: "Ms. Davis", time: "9:00-10:00" },
              { subject: "History", teacher: "Mrs. Brown", time: "10:00-11:00" },
              { subject: "Mathematics", teacher: "Mr. Johnson", time: "11:00-12:00" }
            ]
          },
          {
            day: "Wednesday",
            periods: [
              { subject: "Mathematics", teacher: "Mr. Johnson", time: "9:00-10:00" },
              { subject: "Science", teacher: "Dr. Wilson", time: "10:00-11:00" },
              { subject: "Physical Education", teacher: "Mr. Taylor", time: "2:00-3:00" }
            ]
          },
          {
            day: "Thursday",
            periods: [
              { subject: "English", teacher: "Ms. Davis", time: "9:00-10:00" },
              { subject: "History", teacher: "Mrs. Brown", time: "10:00-11:00" },
              { subject: "Science", teacher: "Dr. Wilson", time: "11:00-12:00" }
            ]
          },
          {
            day: "Friday",
            periods: [
              { subject: "Mathematics", teacher: "Mr. Johnson", time: "9:00-10:00" },
              { subject: "History", teacher: "Mrs. Brown", time: "10:00-11:00" },
              { subject: "Physical Education", teacher: "Mr. Taylor", time: "2:00-3:00" }
            ]
          }
        ],
        statistics: {
          total_students: 28,
          average_attendance: 87.5,
          average_gpa: 3.4,
          subject_performance: {
            "Mathematics": 85,
            "English": 82,
            "Science": 88,
            "History": 79,
            "Physical Education": 91
          },
          enrollment_trends: [
            { month: "Jan", count: 25 },
            { month: "Feb", count: 26 },
            { month: "Mar", count: 27 },
            { month: "Apr", count: 27 },
            { month: "May", count: 28 },
            { month: "Jun", count: 28 }
          ]
        }
      }

      setClassDetails(mockClassDetails)
    } catch (error) {
      console.error('Error loading class details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load class details"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportClassReport = () => {
    if (!classDetails) return

    const reportData = [
      ["Class Details Report"],
      ["School: Springfield High School"],
      ["Generated: " + new Date().toLocaleDateString()],
      [""],
      ["Class Information"],
      ["Name", classDetails.name],
      ["Grade", classDetails.grade],
      ["Section", classDetails.section],
      ["Teacher", `${classDetails.teacher.first_name} ${classDetails.teacher.last_name}`],
      ["Total Students", classDetails.students.length],
      [""],
      ["Student List"],
      ["ID", "Name", "Email", "Attendance %", "GPA"],
      ...classDetails.students.map(student => [
        student.id,
        `${student.user.first_name} ${student.user.last_name}`,
        student.user.email,
        `${student.attendance_rate.toFixed(1)}%`,
        student.current_gpa.toFixed(1)
      ]),
      [""],
      ["Subject Performance"],
      ["Subject", "Average Score"],
      ...Object.entries(classDetails.statistics.subject_performance).map(([subject, score]) => [
        subject,
        `${score}%`
      ]),
      [""],
      ["Weekly Schedule"],
      ...classDetails.schedule.flatMap(day =>
        [
          [day.day],
          ["Period", "Subject", "Teacher", "Time"],
          ...day.periods.map(period => [
            "",
            period.subject,
            period.teacher,
            period.time
          ]),
          [""]
        ]
      )
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(reportData)
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, "Class Report")
    XLSX.writeFile(wb, `Class_${classDetails.name}_Report_${new Date().toISOString().split('T')[0]}.xlsx`)

    toast({
      title: "Report Generated",
      description: `Class report for ${classDetails.name} downloaded successfully`
    })
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading class details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!classDetails) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Class Not Found</DialogTitle>
              <DialogDescription>Unable to load class information.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {classDetails?.name} - Class Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about {classDetails?.name}
            </DialogDescription>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grade:</span>
                    <span className="font-medium">{classDetails.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section:</span>
                    <span className="font-medium">{classDetails.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Students:</span>
                    <span className="font-medium">{classDetails.students.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class Teacher:</span>
                    <span className="font-medium">{classDetails.teacher.first_name} {classDetails.teacher.last_name}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Attendance:</span>
                    <span className="font-medium text-green-600">{classDetails.statistics.average_attendance.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average GPA:</span>
                    <span className="font-medium text-blue-600">{classDetails.statistics.average_gpa.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subjects:</span>
                    <span className="font-medium">{classDetails.subjects.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(classDetails.statistics.subject_performance).map(([subject, score]) => (
                    <div key={subject} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="font-medium">{subject}</span>
                      <Badge variant={score >= 85 ? "secondary" : score >= 70 ? "outline" : "destructive"}>
                        {score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student List</CardTitle>
                <CardDescription>
                  {classDetails.students.length} students enrolled in {classDetails.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classDetails.students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {student.user.first_name[0]}{student.user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.user.first_name} {student.user.last_name}</p>
                              <p className="text-sm text-muted-foreground">{student.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.attendance_rate >= 85 ? "secondary" : "outline"}>
                            {student.attendance_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.current_gpa >= 3.5 ? "secondary" : student.current_gpa >= 3.0 ? "outline" : "destructive"}>
                            {student.current_gpa.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(student.enrollment_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                <CardDescription>
                  Complete timetable for {classDetails.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classDetails.schedule.map((daySchedule) => (
                    <div key={daySchedule.day} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3">{daySchedule.day}</h4>
                      <div className="space-y-2">
                        {daySchedule.periods.map((period, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                            <div>
                              <p className="font-medium">{period.subject}</p>
                              <p className="text-sm text-muted-foreground">{period.teacher}</p>
                            </div>
                            <Badge variant="outline">{period.time}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average GPA</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {classDetails.statistics.average_gpa.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Attendance</span>
                    <span className="text-2xl font-bold text-green-600">
                      {classDetails.statistics.average_attendance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Students</span>
                    <span className="text-2xl font-bold">
                      {classDetails.students.length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enrollment Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {classDetails.statistics.enrollment_trends.map((trend) => (
                      <div key={trend.month} className="flex justify-between items-center">
                        <span>{trend.month}</span>
                        <Badge variant="outline">{trend.count} students</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(classDetails.statistics.subject_performance).map(([subject, score]) => (
                    <div key={subject} className="flex justify-between items-center">
                      <span className="font-medium">{subject}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Class Fee Management
                </CardTitle>
                <CardDescription>
                  View and edit fee details and payment status for {classDetails.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setShowFeeDetailsModal(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    size="lg"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    View Fee Details
                  </Button>
                  <Button
                    onClick={() => setShowEditFeeModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    size="lg"
                    variant="outline"
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    Edit Fee Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleExportClassReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <FeeDetailsModal
      isOpen={showFeeDetailsModal}
      onClose={() => setShowFeeDetailsModal(false)}
      classId={classId || undefined}
      className={classDetails?.name}
    />

    <EditFeeModal
      isOpen={showEditFeeModal}
      onClose={() => setShowEditFeeModal(false)}
      classId={classId || undefined}
      className={classDetails?.name}
      onUpdate={() => {
        // Refresh fee data after update
        toast({
          title: "Fee Details Updated",
          description: "Class fee details have been updated successfully."
        })
      }}
    />
    </>
  )
}