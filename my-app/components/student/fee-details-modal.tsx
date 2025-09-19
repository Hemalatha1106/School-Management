"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  GraduationCap,
  Receipt,
  Download,
  Eye,
  Send
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api, apiClient } from "@/lib/api"
import { FeePaymentModal } from "./fee-payment-modal"

interface FeeDetails {
  id: number
  student: {
    user: { id: number; first_name: string; last_name: string }
    school_class: string
  }
  amount: string
  due_date: string
  status: "paid" | "unpaid" | "partial"
  fee_type?: string
  academic_year?: string
}

interface ClassFeeSummary {
  class_name: string
  total_students: number
  total_fees: number
  paid_fees: number
  pending_fees: number
  overdue_fees: number
  collection_rate: number
}

interface FeeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  studentId?: number
  classId?: number
  studentName?: string
  className?: string
}

export function FeeDetailsModal({
  isOpen,
  onClose,
  studentId,
  classId,
  studentName,
  className
}: FeeDetailsModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [studentFees, setStudentFees] = useState<FeeDetails[]>([])
  const [classFees, setClassFees] = useState<FeeDetails[]>([])
  const [classSummary, setClassSummary] = useState<ClassFeeSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<FeeDetails | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (studentId) {
        loadStudentFees()
      } else if (classId) {
        loadClassFees()
      }
    }
  }, [isOpen, studentId, classId])

  const loadStudentFees = async () => {
    setIsLoading(true)
    try {
      // Mock data for student fees
      const mockFees: FeeDetails[] = [
        {
          id: 1,
          student: {
            user: { id: studentId || 1, first_name: studentName?.split(' ')[0] || 'John', last_name: studentName?.split(' ')[1] || 'Doe' },
            school_class: '10-A'
          },
          amount: '2500',
          due_date: '2024-10-15',
          status: 'paid',
          fee_type: 'Tuition Fee',
          academic_year: '2024-2025'
        },
        {
          id: 2,
          student: {
            user: { id: studentId || 1, first_name: studentName?.split(' ')[0] || 'John', last_name: studentName?.split(' ')[1] || 'Doe' },
            school_class: '10-A'
          },
          amount: '800',
          due_date: '2024-11-15',
          status: 'unpaid',
          fee_type: 'Library Fee',
          academic_year: '2024-2025'
        },
        {
          id: 3,
          student: {
            user: { id: studentId || 1, first_name: studentName?.split(' ')[0] || 'John', last_name: studentName?.split(' ')[1] || 'Doe' },
            school_class: '10-A'
          },
          amount: '1200',
          due_date: '2024-09-30',
          status: 'partial',
          fee_type: 'Transportation Fee',
          academic_year: '2024-2025'
        }
      ]
      setStudentFees(mockFees)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load student fee details"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadClassFees = async () => {
    setIsLoading(true)
    try {
      // Fetch real student data for the class
      const studentsResponse = await api.students.list()
      if (!studentsResponse.success) {
        throw new Error("Failed to fetch students")
      }

      const classStudents = (studentsResponse.data as any[]).filter((student: any) =>
        student.school_class === className
      )

      // Fetch individual fees for each student from database
      const studentFeesPromises = classStudents.map(async (student: any) => {
        try {
          // Fetch fees for this specific student
          const feeResponse = await apiClient.get(`/fees/student/${student.user.id}/`)
          if (feeResponse.success && (feeResponse.data as any[]).length > 0) {
            // Return actual fees from database
            return (feeResponse.data as any[]).map((fee: any) => ({
              id: fee.id,
              student: student,
              amount: fee.amount,
              due_date: fee.due_date,
              status: fee.status,
              fee_type: fee.fee_type || 'Tuition Fee',
              academic_year: fee.academic_year || '2024-2025'
            }))
          } else {
            // If no fees found in database, create default fee structure
            return [{
              id: `default-${student.user.id}`,
              student: student,
              amount: '2500', // Default tuition fee
              due_date: '2024-10-15',
              status: 'unpaid' as const,
              fee_type: 'Tuition Fee',
              academic_year: '2024-2025'
            }]
          }
        } catch (error) {
          // If API fails, return default fee
          return [{
            id: `default-${student.user.id}`,
            student: student,
            amount: '2500',
            due_date: '2024-10-15',
            status: 'unpaid' as const,
            fee_type: 'Tuition Fee',
            academic_year: '2024-2025'
          }]
        }
      })

      const studentFeesArrays = await Promise.all(studentFeesPromises)
      const allFees = studentFeesArrays.flat()

      setClassFees(allFees)

      // Calculate class summary based on actual fees
      const totalFees = allFees.reduce((sum: number, fee: FeeDetails) => sum + parseFloat(fee.amount), 0)
      const paidFees = allFees.filter((fee: FeeDetails) => fee.status === 'paid').reduce((sum: number, fee: FeeDetails) => sum + parseFloat(fee.amount), 0)
      const pendingFees = allFees.filter((fee: FeeDetails) => fee.status !== 'paid').reduce((sum: number, fee: FeeDetails) => sum + parseFloat(fee.amount), 0)
      const overdueFees = allFees.filter((fee: FeeDetails) => fee.status !== 'paid' && new Date(fee.due_date) < new Date()).reduce((sum: number, fee: FeeDetails) => sum + parseFloat(fee.amount), 0)

      setClassSummary({
        class_name: className || '10-A',
        total_students: classStudents.length,
        total_fees: totalFees,
        paid_fees: paidFees,
        pending_fees: pendingFees,
        overdue_fees: overdueFees,
        collection_rate: totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0
      })
    } catch (error) {
      console.error('Error loading class fees:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load class fee details. Using default data."
      })

      // Fallback to basic mock data if API fails
      setClassFees([])
      setClassSummary({
        class_name: className || '10-A',
        total_students: 0,
        total_fees: 0,
        paid_fees: 0,
        pending_fees: 0,
        overdue_fees: 0,
        collection_rate: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayFee = (fee: FeeDetails) => {
    setSelectedFeeForPayment(fee)
    setShowPaymentModal(true)
  }

  const getStatusBadge = (status: string) => {
    const isOverdue = status !== 'paid' && new Date() > new Date('2024-10-15') // Mock overdue check

    if (isOverdue) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    }

    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "unpaid":
        return <Badge className="bg-yellow-100 text-yellow-800">Unpaid</Badge>
      case "partial":
        return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const generateReceipt = (fee: FeeDetails) => {
    const receiptWindow = window.open('', '_blank')
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Fee Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .details { margin: 20px 0; }
              .amount { font-size: 18px; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>School Fee Receipt</h1>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="details">
              <p><strong>Student Name:</strong> ${fee.student.user.first_name} ${fee.student.user.last_name}</p>
              <p><strong>Class:</strong> ${fee.student.school_class}</p>
              <p><strong>Fee Type:</strong> ${fee.fee_type || 'General Fee'}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">₹${fee.amount}</span></p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${fee.status}</p>
            </div>
            <div class="footer">
              <p>This is a computer-generated receipt. Please keep it for your records.</p>
            </div>
          </body>
        </html>
      `)
      receiptWindow.document.close()
      receiptWindow.print()
    }
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading fee details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {studentId ? `Fee Details - ${studentName}` : `Class Fee Details - ${className}`}
            </DialogTitle>
            <DialogDescription>
              {studentId
                ? "View and manage fee payments for this student"
                : "Comprehensive fee overview for the entire class"
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Fee Details</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {studentId ? (
                // Student Overview
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ₹{studentFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0).toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          ₹{studentFees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0).toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {studentFees.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Fees</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Class Overview
                classSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {classSummary.total_students}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Students</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            ₹{classSummary.paid_fees.toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground">Collected</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            ₹{classSummary.pending_fees.toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {classSummary.collection_rate}%
                          </div>
                          <p className="text-sm text-muted-foreground">Collection Rate</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {studentId ? "Student Fee Records" : "Class Fee Records"}
                  </CardTitle>
                  <CardDescription>
                    {studentId
                      ? "All fee records for this student"
                      : "Fee records for all students in this class"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {classId && <TableHead>Student</TableHead>}
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(studentId ? studentFees : classFees).map((fee) => (
                        <TableRow key={fee.id}>
                          {classId && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {fee.student.user.first_name[0]}{fee.student.user.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {fee.student.user.first_name} {fee.student.user.last_name}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>{fee.fee_type || 'General Fee'}</TableCell>
                          <TableCell className="font-medium">₹{parseFloat(fee.amount).toLocaleString()}</TableCell>
                          <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(fee.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {fee.status !== 'paid' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePayFee(fee)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Pay
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateReceipt(fee)}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    {studentId ? "Payment history for this student" : "Payment history for this class"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(studentId ? studentFees : classFees)
                      .filter(fee => fee.status === 'paid')
                      .map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {fee.fee_type || 'General Fee'} - {studentId ? '' : `${fee.student.user.first_name} ${fee.student.user.last_name}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Paid on {new Date().toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{parseFloat(fee.amount).toLocaleString()}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateReceipt(fee)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Receipt
                            </Button>
                          </div>
                        </div>
                      ))}
                    {(studentId ? studentFees : classFees).filter(fee => fee.status === 'paid').length === 0 && (
                      <div className="text-center py-8">
                        <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No payment history available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <FeePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        fee={selectedFeeForPayment}
        onPaymentSuccess={() => {
          setShowPaymentModal(false)
          setSelectedFeeForPayment(null)
          // Refresh data
          if (studentId) {
            loadStudentFees()
          } else if (classId) {
            loadClassFees()
          }
          toast({
            title: "Payment Successful",
            description: "Fee payment has been processed successfully"
          })
        }}
      />
    </>
  )
}