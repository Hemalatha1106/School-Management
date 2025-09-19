"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { api, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign, FileText, AlertCircle, CheckCircle, Plus, Download, Send, Eye, Edit, Loader2, Search,
} from "lucide-react"
import { FeeStructureManagement } from "./fee-structure-management"
import { FeeReportDashboard } from "./fee-report-dashboard"
import { FeePaymentModal } from "./fee-payment-modal"

// --- TypeScript Interfaces ---
interface Student {
  user: { id: number; first_name: string; last_name: string; username: string; }
  school_class: string
}
interface SchoolClass { id: number; name: string; }
interface Fee { id: number; student: Student; amount: string; due_date: string; status: "paid" | "unpaid" | "partial"; fee_type?: string; academic_year?: string; }
interface FeeStats { totalCollected: number; totalPending: number; totalOverdue: number; collectionRate: number; }
interface StatusDistribution { paidPercent: number; pendingPercent: number; overduePercent: number; }
interface FeesManagementProps { userRole: 'principal' | 'student' | 'teacher'; }

export function FeesManagement({ userRole }: FeesManagementProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  // ALL hooks must be called at the top level, before any conditional logic
  const [activeTab, setActiveTab] = useState("overview")
  const [allFees, setAllFees] = useState<Fee[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [feeStats, setFeeStats] = useState<FeeStats | null>(null)
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false)
  const [applyTo, setApplyTo] = useState<'student' | 'class'>('student')
  const [feeFormData, setFeeFormData] = useState({ target_id: '', amount: '', due_date: '' })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<Fee | null>(null)

  // Student-specific hooks (must be at top level)
  const [studentFees, setStudentFees] = useState<Fee[]>([])
  const [isLoadingStudentFees, setIsLoadingStudentFees] = useState(true)

  const fetchData = async () => {
    if (userRole === 'student') {
      // For students, show a simple fee information view
      setIsLoading(false);
      return;
    }

    if (userRole !== 'principal') { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const [feesRes, studentsRes, classesRes] = await Promise.all([api.fees.list(), api.students.list(), api.classes.list()])
      if (feesRes.success) { setAllFees(feesRes.data as Fee[]); calculateStatsAndDistribution(feesRes.data as Fee[]); }
      else { throw new Error(feesRes.message) }
      if (studentsRes.success) { setStudents(studentsRes.data as Student[]) }
      else { throw new Error(studentsRes.message) }
      if (classesRes.success) { setClasses(classesRes.data as SchoolClass[]) }
      else { throw new Error(classesRes.message) }
    } catch (err: any) { setError(err.message || "An unexpected error occurred.") }
    finally { setIsLoading(false) }
  }

  // Fetch data for principal and student roles
  useEffect(() => { fetchData() }, [userRole, currentUser])

  // Fetch student fees when userRole is student (moved to top level)
  useEffect(() => {
    if (userRole === 'student' && currentUser?.id) {
      const fetchStudentFees = async () => {
        try {
          // Fetch fees for the current student using the correct API endpoint
          const feeResponse = await api.students.fees(currentUser.id)
          if (feeResponse.success && Array.isArray(feeResponse.data) && feeResponse.data.length > 0) {
            // Use actual fees from database
            const fees = feeResponse.data.map((fee: any) => ({
              id: fee.id,
              student: {
                user: currentUser,
                school_class: fee.student?.school_class || currentUser.profile?.class_name || '10-A'
              },
              amount: fee.amount.toString(),
              due_date: fee.due_date,
              status: fee.status,
              fee_type: fee.fee_type?.name || fee.fee_type || 'General Fee',
              academic_year: fee.academic_year || '2024-2025'
            }))
            setStudentFees(fees)
          } else {
            // If no fees found, show empty state instead of mock data
            setStudentFees([])
          }
        } catch (error) {
          console.error('Error fetching student fees:', error)
          // Show empty state instead of fallback mock data
          setStudentFees([])
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load fee information. Please try again."
          })
        } finally {
          setIsLoadingStudentFees(false)
        }
      }

      fetchStudentFees()
    } else {
      setIsLoadingStudentFees(false)
    }
  }, [userRole, currentUser, toast])

  const calculateStatsAndDistribution = (fees: Fee[]) => {
    const stats: FeeStats = { totalCollected: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 };
    let totalAmount = 0;
    const counts = { paid: 0, pending: 0, overdue: 0, total: fees.length };
    fees.forEach(fee => {
      const amount = parseFloat(fee.amount);
      totalAmount += amount;
      const isOverdue = new Date(fee.due_date) < new Date() && fee.status !== 'paid';
      if (fee.status === 'paid') { stats.totalCollected += amount; counts.paid++; }
      else { stats.totalPending += amount; if (isOverdue) { stats.totalOverdue += amount; counts.overdue++; } else { counts.pending++; } }
    });
    stats.collectionRate = totalAmount > 0 ? parseFloat(((stats.totalCollected / totalAmount) * 100).toFixed(1)) : 0;
    setFeeStats(stats);
    setDistribution({
      paidPercent: counts.total > 0 ? Math.round((counts.paid / counts.total) * 100) : 0,
      pendingPercent: counts.total > 0 ? Math.round((counts.pending / counts.total) * 100) : 0,
      overduePercent: counts.total > 0 ? Math.round((counts.overdue / counts.total) * 100) : 0,
    });
  };

  const getStatusBadge = (fee: Fee) => {
    const isOverdue = new Date(fee.due_date) < new Date() && fee.status !== 'paid';
    if (isOverdue) return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    switch (fee.status) {
      case "paid": return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "unpaid": return <Badge className="bg-yellow-100 text-yellow-800">Unpaid</Badge>;
      case "partial": return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const { paidFees, unpaidFees } = useMemo(() => {
    const filtered = allFees.filter(fee => `${fee.student.user.first_name} ${fee.student.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return {
      paidFees: filtered.filter(f => f.status === 'paid'),
      unpaidFees: filtered.filter(f => f.status !== 'paid').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    };
  }, [allFees, searchTerm]);

  const handleAddFee = async () => {
    setIsSubmitting(true);
    try {
      const response = applyTo === 'student'
        ? await api.fees.createFee(parseInt(feeFormData.target_id), parseFloat(feeFormData.amount), feeFormData.due_date)
        : await api.fees.createClassFee(parseInt(feeFormData.target_id), parseFloat(feeFormData.amount), feeFormData.due_date);
      if (response.success) {
        toast({ title: "Success", description: (response.data as any)?.message || "Fee action successful." });
        setIsFeeDialogOpen(false);
        fetchData();
      } else { throw new Error(response.message); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  const handleSendReminders = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.fees.sendReminders();
      if (response.success) toast({ title: "Success", description: (response.data as any)?.message });
      else throw new Error(response.message);
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  const handleGenerateReport = async () => {
    try {
      const response = await apiClient.get(`/fees/actions/?action=generate_report`);
      if (response.success && typeof response.data === 'string') {
        const newWindow = window.open();
        newWindow?.document.write(response.data);
        newWindow?.document.close();
      } else { throw new Error(response.message || "Failed to generate report."); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  };

  const handleExportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,Student Name,Class,Amount,Due Date,Status\n";
    allFees.forEach(fee => {
      const row = [`"${fee.student.user.first_name} ${fee.student.user.last_name}"`, fee.student.school_class, fee.amount, fee.due_date, fee.status].join(",");
      csvContent += row + "\r\n";
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "fee_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Card className="border-red-200 bg-red-50"><CardContent className="pt-4"><p className="text-red-700">{error}</p></CardContent></Card>;
  if (userRole !== 'principal' && userRole !== 'student') return <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader></Card>;


  if ((userRole as string) === 'student') {
    if (isLoadingStudentFees) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your fees...</span>
        </div>
      )
    }

    // Calculate totals from actual fees
    const totalFees = studentFees.reduce((sum: number, fee: Fee) => sum + parseFloat(fee.amount), 0)
    const paidFees = studentFees.filter((fee: Fee) => fee.status === 'paid').reduce((sum: number, fee: Fee) => sum + parseFloat(fee.amount), 0)
    const pendingFees = totalFees - paidFees

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Fees</CardTitle>
            <CardDescription>View your fee payment status and history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">₹{totalFees.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">₹{paidFees.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Paid</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">₹{pendingFees.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Fee Records</h3>
                  <Button variant="outline" size="sm" onClick={() => {
                    // Generate receipt functionality with real data
                    const receiptData = {
                      studentName: currentUser?.first_name + ' ' + currentUser?.last_name,
                      totalAmount: `₹${totalFees.toLocaleString()}`,
                      paidAmount: `₹${paidFees.toLocaleString()}`,
                      pendingAmount: `₹${pendingFees.toLocaleString()}`,
                      date: new Date().toLocaleDateString()
                    };
                    const receiptWindow = window.open('', '_blank');
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
                              <p>Generated on: ${receiptData.date}</p>
                            </div>
                            <div class="details">
                              <p><strong>Student Name:</strong> ${receiptData.studentName}</p>
                              <p><strong>Total Fees:</strong> <span class="amount">${receiptData.totalAmount}</span></p>
                              <p><strong>Amount Paid:</strong> <span class="amount text-green-600">${receiptData.paidAmount}</span></p>
                              <p><strong>Pending Amount:</strong> <span class="amount text-yellow-600">${receiptData.pendingAmount}</span></p>
                            </div>
                            <div class="footer">
                              <p>This is a computer-generated receipt. Please keep it for your records.</p>
                            </div>
                          </body>
                        </html>
                      `);
                      receiptWindow.document.close();
                      receiptWindow.print();
                    }
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Receipt
                  </Button>
                </div>
                <div className="space-y-2">
                  {studentFees.map((fee: Fee) => (
                    <div key={fee.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{fee.fee_type || 'General Fee'}</p>
                        <p className="text-sm text-muted-foreground">Due: {new Date(fee.due_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={fee.status === 'paid' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {fee.status}
                        </Badge>
                        {fee.status !== 'paid' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedFeeForPayment(fee);
                            setIsPaymentModalOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-1" />
                            Pay Now
                          </Button>
                        )}
                        {fee.status === 'paid' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            const receiptWindow = window.open('', '_blank');
                            if (receiptWindow) {
                              receiptWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Payment Receipt - ${fee.fee_type}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; margin: 20px; }
                                      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                                      .details { margin: 20px 0; }
                                      .amount { font-size: 18px; font-weight: bold; color: green; }
                                      .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>Payment Receipt</h1>
                                      <h2>${fee.fee_type}</h2>
                                    </div>
                                    <div class="details">
                                      <p><strong>Student Name:</strong> ${currentUser?.first_name} ${currentUser?.last_name}</p>
                                      <p><strong>Fee Type:</strong> ${fee.fee_type}</p>
                                      <p><strong>Amount Paid:</strong> <span class="amount">₹${fee.amount}</span></p>
                                      <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                                      <p><strong>Due Date:</strong> ${new Date(fee.due_date).toLocaleDateString()}</p>
                                      <p><strong>Status:</strong> Paid</p>
                                    </div>
                                    <div class="footer">
                                      <p>Thank you for your payment. This receipt serves as proof of payment.</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              receiptWindow.document.close();
                            }
                          }}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">Manage student fees, payments, and financial records</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <DollarSign className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview - Only show for principal */}
      {userRole === 'principal' && feeStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-gradient-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">₹{feeStats.totalCollected.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gradient-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gradient-secondary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">₹{feeStats.totalPending.toLocaleString()}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gradient-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">₹{feeStats.totalOverdue.toLocaleString()}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gradient-accent">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold">{feeStats.collectionRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-gradient-accent" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Fee</DialogTitle><DialogDescription>Create a new fee record for a student or an entire class.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2"><Label>Apply To</Label>
              <Select onValueChange={(v) => { setApplyTo(v as any); setFeeFormData(p => ({...p, target_id: ''}))}} defaultValue="student">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="student">A Single Student</SelectItem><SelectItem value="class">An Entire Class</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{applyTo === 'student' ? 'Student' : 'Class'}</Label>
              {applyTo === 'student' ? (
                <Select onValueChange={(v) => setFeeFormData(p => ({...p, target_id: v}))}><SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.user.id} value={s.user.id.toString()}>{s.user.first_name} {s.user.last_name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Select onValueChange={(v) => setFeeFormData(p => ({...p, target_id: v}))}><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" placeholder="e.g., 2500" value={feeFormData.amount} onChange={e => setFeeFormData(p => ({...p, amount: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={feeFormData.due_date} onChange={e => setFeeFormData(p => ({...p, due_date: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddFee} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Fee</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {feeStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">₹{feeStats.totalCollected.toLocaleString()}</div><p className="text-xs text-muted-foreground">This academic year</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Payments</CardTitle><AlertCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">₹{feeStats.totalPending.toLocaleString()}</div><p className="text-xs text-muted-foreground">Awaiting payment</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Overdue Amount</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">₹{feeStats.totalOverdue.toLocaleString()}</div><p className="text-xs text-muted-foreground">Past due date</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Collection Rate</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{feeStats.collectionRate}%</div><p className="text-xs text-muted-foreground">Payment success rate</p></CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="students">Student Fees</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Payment Status Distribution</CardTitle><CardDescription>Overview of payment statuses</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-sm">Paid</span><span className="text-sm font-medium">{distribution?.paidPercent}%</span></div><Progress value={distribution?.paidPercent} /></div>
                <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-sm">Pending</span><span className="text-sm font-medium">{distribution?.pendingPercent}%</span></div><Progress value={distribution?.pendingPercent} /></div>
                <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-sm">Overdue</span><span className="text-sm font-medium">{distribution?.overduePercent}%</span></div><Progress value={distribution?.overduePercent} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle><CardDescription>Common fee management tasks</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setIsFeeDialogOpen(true)}><Plus className="h-6 w-6" /> Add Fee</Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleSendReminders} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-6 w-6 animate-spin"/> : <Send className="h-6 w-6" />} Send Reminders</Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleGenerateReport}><FileText className="h-6 w-6" /> Generate Report</Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleExportData}><Download className="h-6 w-6" /> Export Data</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="students" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Records</CardTitle>
              <CardDescription>A directory of all fee records, separated by payment status.</CardDescription>
              <div className="relative pt-4"><Search className="absolute left-2.5 top-6.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 max-w-sm" /></div>
            </CardHeader>
            <CardContent>
              {unpaidFees.length === 0 && paidFees.length === 0 && searchTerm ? ( <div className="text-center text-muted-foreground py-12"><Search className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-semibold">No Results Found</h3><p className="mt-1 text-sm">Your search for "{searchTerm}" did not match any fee records.</p></div> ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-4">Pending & Overdue Fees ({unpaidFees.length})</h3>
                    {unpaidFees.length > 0 ? (
                      <div className="space-y-2">{unpaidFees.map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3"><Avatar><AvatarFallback>{fee.student.user.first_name?.[0]}{fee.student.user.last_name?.[0]}</AvatarFallback></Avatar><div><p className="font-medium">{fee.student.user.first_name} {fee.student.user.last_name}</p><p className="text-sm text-muted-foreground">Class {fee.student.school_class}</p></div></div>
                          <div className="flex items-center gap-4"><div className="text-right"><p className="font-semibold">₹{parseFloat(fee.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">Due: {fee.due_date}</p></div>{getStatusBadge(fee)}</div>
                        </div>))}
                      </div>
                    ) : ( <p className="text-sm text-muted-foreground py-4 text-center">All pending fees are cleared!</p> )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-4">Cleared Fees ({paidFees.length})</h3>
                    {paidFees.length > 0 ? (
                      <div className="space-y-2">{paidFees.map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3"><Avatar><AvatarFallback>{fee.student.user.first_name?.[0]}{fee.student.user.last_name?.[0]}</AvatarFallback></Avatar><div><p className="font-medium text-muted-foreground">{fee.student.user.first_name} {fee.student.user.last_name}</p><p className="text-sm text-muted-foreground">Class {fee.student.school_class}</p></div></div>
                          <div className="flex items-center gap-4"><div className="text-right"><p className="font-semibold text-muted-foreground">₹{parseFloat(fee.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">Due: {fee.due_date}</p></div>{getStatusBadge(fee)}</div>
                        </div>))}
                      </div>
                    ) : ( <p className="text-sm text-muted-foreground py-4 text-center">No cleared fees match your search.</p> )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="structure" className="pt-4">
            <FeeStructureManagement />
        </TabsContent>
        <TabsContent value="reports" className="pt-4">
            <FeeReportDashboard />
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <FeePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        fee={selectedFeeForPayment}
        onPaymentSuccess={() => {
          // Refresh data or update UI after successful payment
          if (userRole === 'student') {
            // For students, just close the modal and show success
            setIsPaymentModalOpen(false);
          } else {
            // For principals, refresh the data
            fetchData();
          }
        }}
      />
    </div>
  )
}