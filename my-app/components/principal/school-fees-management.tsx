"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Edit,
  Save,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  Shield,
  Download,
  Upload,
  Eye,
  EyeOff,
  BarChart3,
  Calendar,
  Receipt,
  CreditCard,
  PieChart
} from "lucide-react"

// Comprehensive School Fee Structure Interface
interface SchoolFee {
  id: number
  class_id: number
  class_name: string
  fee_type: "tuition" | "exam" | "transport" | "lab" | "library" | "sports" | "other"
  name: string
  amount: string
  frequency: "monthly" | "quarterly" | "annually" | "one-time"
  due_date: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
  audit_trail: { timestamp: string, action: string, user_id: number }[]
}

interface FeePayment {
  id: number
  student_id: number
  student_name: string
  class_name: string
  fee_id: number
  fee_name: string
  amount: number
  payment_date: string
  payment_method: "cash" | "online" | "bank_transfer" | "cheque"
  status: "paid" | "pending" | "overdue" | "partial"
  receipt_number: string
  collected_by: string
}

interface FeeReport {
  total_fees: number
  collected_amount: number
  pending_amount: number
  overdue_amount: number
  collection_rate: number
  class_wise_breakdown: { class_name: string, collected: number, pending: number, rate: number }[]
  monthly_trend: { month: string, collected: number, target: number }[]
}

export function SchoolFeesManagement() {
  const { toast } = useToast()
  const [fees, setFees] = useState<SchoolFee[]>([])
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [classes, setClasses] = useState<{ id: number, name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("fees")
  const [showAddFeeForm, setShowAddFeeForm] = useState(false)
  const [editingFee, setEditingFee] = useState<SchoolFee | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedFee, setSelectedFee] = useState<SchoolFee | null>(null)
  const [reportData, setReportData] = useState<FeeReport | null>(null)

  // Form states
  const [newFee, setNewFee] = useState<{
    class_id: string
    fee_type: "tuition" | "exam" | "transport" | "lab" | "library" | "sports" | "other"
    name: string
    amount: string
    frequency: "monthly" | "quarterly" | "annually" | "one-time"
    due_date: string
    description: string
  }>({
    class_id: "",
    fee_type: "tuition",
    name: "",
    amount: "",
    frequency: "monthly",
    due_date: "",
    description: ""
  })

  const [newPayment, setNewPayment] = useState({
    student_id: "",
    fee_id: "",
    amount: "",
    payment_method: "online" as const,
    receipt_number: ""
  })

  useEffect(() => {
    fetchFees()
    fetchClasses()
    fetchPayments()
    generateReport()
  }, [])

  const fetchFees = async () => {
    try {
      // Import sample data from centralized demo data file
      const { sampleSchoolFees } = await import("@/components/shared/fee-demo-data")
      setFees(sampleSchoolFees)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load fees"
      })
    }
  }

  const fetchClasses = async () => {
    try {
      // Import sample classes data from centralized demo data file
      const { sampleClasses } = await import("@/components/shared/fee-demo-data")
      setClasses(sampleClasses)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load classes"
      })
    }
  }

  const fetchPayments = async () => {
    try {
      // Import sample payments data from centralized demo data file
      const { sampleFeePayments } = await import("@/components/shared/fee-demo-data")
      setPayments(sampleFeePayments)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payments"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async () => {
    // Import sample report data from centralized demo data file
    const { sampleFeeReport } = await import("@/components/shared/fee-demo-data")
    setReportData(sampleFeeReport)
  }

  const handleSaveFee = async () => {
    try {
      if (editingFee) {
        // Update existing fee
        const updatedFee: SchoolFee = {
          ...editingFee,
          ...newFee,
          class_id: parseInt(newFee.class_id),
          class_name: classes.find(c => c.id === parseInt(newFee.class_id))?.name || ""
        }
        setFees(prev => prev.map(f => f.id === editingFee.id ? updatedFee : f))
        toast({
          title: "Success",
          description: "Fee updated successfully"
        })
      } else {
        // Create new fee
        const selectedClass = classes.find(c => c.id === parseInt(newFee.class_id))
        const newFeeObj: SchoolFee = {
          ...newFee,
          id: Date.now(),
          class_id: parseInt(newFee.class_id),
          class_name: selectedClass?.name || "",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          audit_trail: [{
            timestamp: new Date().toISOString(),
            action: "created",
            user_id: 1 // Current user ID
          }]
        }
        setFees(prev => [...prev, newFeeObj])
        toast({
          title: "Success",
          description: "Fee created successfully"
        })
      }

      setShowAddFeeForm(false)
      setEditingFee(null)
      resetFeeForm()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save fee"
      })
    }
  }

  const resetFeeForm = () => {
    setNewFee({
      class_id: "",
      fee_type: "tuition",
      name: "",
      amount: "",
      frequency: "monthly",
      due_date: "",
      description: ""
    })
  }

  const handleEditFee = (fee: SchoolFee) => {
    setEditingFee(fee)
    setNewFee({
      class_id: fee.class_id.toString(),
      fee_type: fee.fee_type,
      name: fee.name,
      amount: fee.amount,
      frequency: fee.frequency,
      due_date: fee.due_date,
      description: fee.description
    })
    setShowAddFeeForm(true)
  }

  const handleRecordPayment = async () => {
    try {
      const payment: FeePayment = {
        id: Date.now(),
        student_id: parseInt(newPayment.student_id),
        student_name: "Sample Student", // In real app, fetch from API
        class_name: "Sample Class", // In real app, fetch from API
        fee_id: parseInt(newPayment.fee_id),
        fee_name: fees.find(f => f.id === parseInt(newPayment.fee_id))?.name || "",
        amount: parseFloat(newPayment.amount),
        payment_date: new Date().toISOString(),
        payment_method: newPayment.payment_method,
        status: "paid",
        receipt_number: newPayment.receipt_number,
        collected_by: "Principal" // Current user
      }

      setPayments(prev => [...prev, payment])
      toast({
        title: "Success",
        description: "Payment recorded successfully"
      })

      setShowPaymentForm(false)
      setNewPayment({
        student_id: "",
        fee_id: "",
        amount: "",
        payment_method: "online",
        receipt_number: ""
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment"
      })
    }
  }

  const handleExportReport = () => {
    if (!reportData) return

    const reportContent = `
SCHOOL FEES REPORT
Generated: ${new Date().toLocaleDateString()}

SUMMARY
=======
Total Fees: ₹${reportData.total_fees.toLocaleString()}
Collected: ₹${reportData.collected_amount.toLocaleString()}
Pending: ₹${reportData.pending_amount.toLocaleString()}
Overdue: ₹${reportData.overdue_amount.toLocaleString()}
Collection Rate: ${reportData.collection_rate}%

CLASS-WISE BREAKDOWN
==================
${reportData.class_wise_breakdown.map(cls =>
  `${cls.class_name}: Collected ₹${cls.collected.toLocaleString()}, Pending ₹${cls.pending.toLocaleString()}, Rate ${cls.rate}%`
).join('\n')}

MONTHLY TREND
=============
${reportData.monthly_trend.map(month =>
  `${month.month}: Collected ₹${month.collected.toLocaleString()}, Target ₹${month.target.toLocaleString()}`
).join('\n')}
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fees_report_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Report Exported",
      description: "Fees report downloaded successfully"
    })
  }

  const getFeeTypeBadge = (type: string) => {
    const colors = {
      tuition: "bg-blue-100 text-blue-800",
      exam: "bg-red-100 text-red-800",
      transport: "bg-green-100 text-green-800",
      lab: "bg-purple-100 text-purple-800",
      library: "bg-yellow-100 text-yellow-800",
      sports: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800"
    }
    return colors[type as keyof typeof colors] || colors.other
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      case "partial":
        return <Badge className="bg-orange-100 text-orange-800">Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Clock className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">School Fees Management</h2>
          <p className="text-muted-foreground">Manage fees, payments, and generate collection reports</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab("reports")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Button>
          <Button
            onClick={() => setShowAddFeeForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Fee Structure
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fees">Fee Structures</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          {/* Fee Structures by Class */}
          {classes.map((classItem) => (
            <Card key={classItem.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {classItem.name} - Fee Structure
                </CardTitle>
                <CardDescription>
                  Manage fees for {classItem.name} class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fees.filter(fee => fee.class_id === classItem.id).map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                            <DollarSign className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{fee.name}</h4>
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getFeeTypeBadge(fee.fee_type)}>
                                {fee.fee_type}
                              </Badge>
                              <Badge variant="outline">{fee.frequency}</Badge>
                              <span className="text-sm font-medium">₹{fee.amount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditFee(fee)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                  {fees.filter(fee => fee.class_id === classItem.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No fees configured for this class
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add/Edit Fee Dialog */}
          <Dialog open={showAddFeeForm} onOpenChange={setShowAddFeeForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFee ? "Edit Fee Structure" : "Add New Fee Structure"}
                </DialogTitle>
                <DialogDescription>
                  Configure fee structure for classes
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={newFee.class_id}
                    onValueChange={(value) => setNewFee({...newFee, class_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select
                    value={newFee.fee_type}
                    onValueChange={(value: any) => setNewFee({...newFee, fee_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tuition">Tuition</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="library">Library</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fee Name</Label>
                  <Input
                    value={newFee.name}
                    onChange={(e) => setNewFee({...newFee, name: e.target.value})}
                    placeholder="e.g., Monthly Tuition Fee"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newFee.amount}
                    onChange={(e) => setNewFee({...newFee, amount: e.target.value})}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newFee.frequency}
                    onValueChange={(value: any) => setNewFee({...newFee, frequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newFee.due_date}
                    onChange={(e) => setNewFee({...newFee, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newFee.description}
                  onChange={(e) => setNewFee({...newFee, description: e.target.value})}
                  placeholder="Describe the fee..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddFeeForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFee}>
                  {editingFee ? "Update" : "Create"} Fee Structure
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Fee Payments</h3>
              <p className="text-sm text-muted-foreground">Record and track student fee payments</p>
            </div>
            <Button onClick={() => setShowPaymentForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          </div>

          {/* Payments List */}
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{payment.student_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {payment.class_name} • {payment.fee_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getPaymentStatusBadge(payment.status)}
                        <Badge variant="outline">{payment.payment_method}</Badge>
                        <span className="text-sm">Receipt: {payment.receipt_number}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Record Payment Dialog */}
          <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Fee Payment</DialogTitle>
                <DialogDescription>
                  Record a new fee payment from a student
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input
                    value={newPayment.student_id}
                    onChange={(e) => setNewPayment({...newPayment, student_id: e.target.value})}
                    placeholder="Enter student ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select
                    value={newPayment.fee_id}
                    onValueChange={(value) => setNewPayment({...newPayment, fee_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee" />
                    </SelectTrigger>
                    <SelectContent>
                      {fees.map((fee) => (
                        <SelectItem key={fee.id} value={fee.id.toString()}>
                          {fee.class_name} - {fee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    placeholder="Enter payment amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={newPayment.payment_method}
                    onValueChange={(value: any) => setNewPayment({...newPayment, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Receipt Number</Label>
                  <Input
                    value={newPayment.receipt_number}
                    onChange={(e) => setNewPayment({...newPayment, receipt_number: e.target.value})}
                    placeholder="Enter receipt number"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment}>
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
                        <p className="text-2xl font-bold">₹{reportData.total_fees.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Collected</p>
                        <p className="text-2xl font-bold text-green-600">₹{reportData.collected_amount.toLocaleString()}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">₹{reportData.pending_amount.toLocaleString()}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                        <p className="text-2xl font-bold text-blue-600">{reportData.collection_rate}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Class-wise Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Class-wise Fee Collection</CardTitle>
                  <CardDescription>Fee collection breakdown by class</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.class_wise_breakdown.map((cls, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{cls.class_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Collected: ₹{cls.collected.toLocaleString()} • Pending: ₹{cls.pending.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {cls.rate}% collected
                          </Badge>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${cls.rate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button onClick={handleExportReport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              Advanced analytics and visualizations for fee management will be available here.
              This includes trend analysis, predictive insights, and detailed financial reporting.
            </AlertDescription>
          </Alert>

          {reportData && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Collection Trend</CardTitle>
                <CardDescription>Fee collection performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.monthly_trend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          ₹{month.collected.toLocaleString()} / ₹{month.target.toLocaleString()}
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${Math.min((month.collected / month.target) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}