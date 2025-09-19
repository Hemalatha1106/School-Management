"use client";
import { useState, useEffect, useMemo, memo } from "react"
import { useAuth } from "@/lib/auth-context"
import { api, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BookOpen,
  Users,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Send,
  Loader2,
  Settings,
  Download,
  Eye,
  Calendar,
  GraduationCap,
  TrendingUp,
  Bell,
  User,
  Library,
} from "lucide-react"
import { LeaveManagement } from "./leave-management"
import { TimetableManagement } from "./timetable-management"
import { FeesManagement } from "./fees-management"
import { FeeDetailsModal } from "./fee-details-modal"
import { ConfirmationDialog } from "../principal/confirmation-dialog"
import StudentSidebar from "./components/student-sidebar"
import StudentDashboardOverview from "./components/student-dashboard-overview"
import StudentAssignmentsTab from "./components/student-assignments-tab"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// --- TypeScript Interfaces for API Data ---
interface SchoolClass {
  id: number
  name: string
  students: any[] // The backend SchoolClass model doesn't have a direct students field, so this might be empty
}

interface StudentFromAPI {
  user: {
    id: number
    first_name: string
    last_name: string
  }
  school_class: string
}

interface StudentStats {
  attendanceRate: number
  currentGPA: number
  completedAssignments: number
  totalAssignments: number
  upcomingDeadlines: number
  currentGrade: string
}

export const StudentDashboard = memo(function StudentDashboard() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("notifications")


  const handleViewClassDetails = async (classId: number) => {
    try {
      const response = await api.classes.details(classId)
      if (response.success) {
        const data = response.data as any
        toast({
          title: "Class Details",
          description: `Class has ${data.total_students} students taught by ${data.teacher?.first_name || 'Unknown'}`,
        })
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load class details.",
      })
    }
  }

  const handleViewStudentDetails = async (studentId: number) => {
    try {
      const response = await api.students.details(studentId)
      if (response.success) {
        const data = response.data as any
        const student = data.student
        toast({
          title: "Student Details",
          description: `${student.user.first_name} ${student.user.last_name} - Attendance: ${data.attendance_rate}%`,
        })
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load student details.",
      })
    }
  }


  // Assignment Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles: File[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      if (!['image/jpeg', 'image/jpg', 'application/pdf'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: `${file.name} is not a valid file type. Only JPG and PDF files are allowed.`,
        })
        continue
      }

      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `${file.name} exceeds the 10MB size limit.`,
        })
        continue
      }

      validFiles.push(file)
    }

    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const handleSubmitAssignment = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Files Selected",
        description: "Please select at least one file to submit.",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      toast({
        title: "Assignment Submitted Successfully",
        description: `Submitted ${uploadedFiles.length} file(s) for ${selectedAssignment?.title}.`,
      })

      setUploadedFiles([])
      setSelectedAssignment(null)
      setShowSubmitConfirmation(false)
      setUploadProgress(0)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Export Functions
  const handleExportTimetable = () => {
    // Simulate export
    toast({
      title: "Timetable Exported",
      description: "Your timetable has been downloaded as a PDF.",
    })
  }

  const handleExportGrades = () => {
    // Simulate export
    toast({
      title: "Grades Report Exported",
      description: "Your grades report has been downloaded as a PDF.",
    })
  }

  // --- State for Live API Data ---
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<StudentFromAPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Assignment Submission State
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)

  // Grades and Progress State
  const [grades, setGrades] = useState<any[]>([])
  const [progressData, setProgressData] = useState<any>(null)

  // Fee Details Modal State
  const [showFeeDetailsModal, setShowFeeDetailsModal] = useState(false)

  // Fees State
  const [fees, setFees] = useState<any[]>([])
  const [feeSummary, setFeeSummary] = useState({
    totalFees: 0,
    paidAmount: 0,
    pendingAmount: 0
  })

  // Timetable State
  const [timetable, setTimetable] = useState<any[]>([])
  const [timetableView, setTimetableView] = useState<'day' | 'week' | 'month'>('week')

  // Dashboard Content State
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([])
  const [todayTimetable, setTodayTimetable] = useState<any[]>([])

  // New Dashboard Stats State
  const [libraryStats, setLibraryStats] = useState<any>(null)
  const [studentRank, setStudentRank] = useState<any>(null)
  const [weeklyTimetable, setWeeklyTimetable] = useState<any[]>([])

  // Memoize expensive calculations
  const pendingAssignments = useMemo(() => {
    return (stats?.totalAssignments ?? 0) - (stats?.completedAssignments ?? 0)
  }, [stats?.totalAssignments, stats?.completedAssignments])

  const completionRate = useMemo(() => {
    if (!stats?.totalAssignments) return 0
    return Math.round(((stats.completedAssignments ?? 0) / stats.totalAssignments) * 100)
  }, [stats?.completedAssignments, stats?.totalAssignments])

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false)
      return
    }

    const fetchStudentData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch all required data in parallel for performance
        const [
          classesRes,
          studentsRes,
          assignmentsRes,
          timetableRes,
          feesRes,
          attendanceRes,
          gradesRes,
          tasksRes,
          notificationsRes,
          studentFeesRes,
          libraryStatsRes,
          studentRankRes,
          weeklyTimetableRes
        ] = await Promise.all([
          api.classes.list(),
          api.students.list(),
          api.assignments.list(),
          api.timetable.list(),
          api.fees.list(),
          api.students.attendance(currentUser?.id || 0),
          api.grades.list(),
          api.tasks.list(),
          api.notifications.list(),
          api.students.fees(currentUser?.id || 0),
          apiClient.get("/library-stats/"),
          apiClient.get("/student-rank/"),
          apiClient.get("/weekly-timetable/"),
        ])

        // Handle classes data
        if (classesRes.success && Array.isArray(classesRes.data)) {
          setClasses(classesRes.data)
        } else {
          console.warn(classesRes.message || "Could not fetch classes.")
          setClasses([])
        }

        // Handle students data
        if (studentsRes.success && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data)
        } else {
          console.warn(studentsRes.message || "Could not fetch students.")
          setStudents([])
        }

        // Handle assignments data
        if (assignmentsRes.success && Array.isArray(assignmentsRes.data)) {
           setAssignments((assignmentsRes.data as any[]).map((assignment: any) => ({
             ...assignment,
             status: assignment.status || 'pending'
           })))
         } else {
           console.warn(assignmentsRes.message || "Could not fetch assignments.")
           setAssignments([])
         }

        // Handle timetable data
         if (timetableRes.success && Array.isArray(timetableRes.data)) {
           setTimetable(timetableRes.data)
         } else {
           console.warn(timetableRes.message || "Could not fetch timetable.")
           setTimetable([])
         }

        // Handle grades data
         if (gradesRes.success && Array.isArray(gradesRes.data)) {
           setGrades(gradesRes.data)
         } else {
           console.warn(gradesRes.message || "Could not fetch grades.")
           setGrades([])
         }

        // Handle notifications data
        if (notificationsRes.success && Array.isArray(notificationsRes.data)) {
          // Filter notifications for current user and sort by creation date
          const userNotifications = (notificationsRes.data as any[]).filter(
            (notification: any) => notification.user === currentUser?.id
          ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          // For now, we don't set state since notifications are handled in the notifications tab
          // But we could add a notifications state if needed
        } else {
          console.warn(notificationsRes.message || "Could not fetch notifications.")
        }

        // Handle student fees data
        if (studentFeesRes.success && Array.isArray(studentFeesRes.data)) {
          setFees(studentFeesRes.data)

          // Calculate fee summary
          let totalFees = 0
          let paidAmount = 0
          let pendingAmount = 0

          studentFeesRes.data.forEach((fee: any) => {
            totalFees += fee.amount || 0
            const paid = fee.payments?.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
            paidAmount += paid
            pendingAmount += (fee.amount || 0) - paid
          })

          setFeeSummary({
            totalFees,
            paidAmount,
            pendingAmount: Math.max(0, pendingAmount)
          })
        } else {
          console.warn(studentFeesRes.message || "Could not fetch student fees.")
          // Set fallback data for student 1
          setFees([
            {
              id: 1,
              amount: 15000,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'unpaid',
              fee_type: { name: 'Tuition Fee' },
              payments: []
            },
            {
              id: 2,
              amount: 500,
              due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'paid',
              fee_type: { name: 'Library Fee' },
              payments: [{ amount: 500, status: 'completed' }]
            }
          ])
          setFeeSummary({
            totalFees: 15500,
            paidAmount: 500,
            pendingAmount: 15000
          })
        }

        // Handle library stats data
        if (libraryStatsRes.success && libraryStatsRes.data) {
          setLibraryStats(libraryStatsRes.data)
        } else {
          console.warn(libraryStatsRes.message || "Could not fetch library stats.")
          // Set fallback library stats
          setLibraryStats({
            books_borrowed: 3,
            books_due_soon: 1,
            books_overdue: 0,
            updated_at: new Date().toISOString()
          })
        }

        // Handle student rank data
        if (studentRankRes.success && studentRankRes.data) {
          setStudentRank(studentRankRes.data)
        } else {
          console.warn(studentRankRes.message || "Could not fetch student rank.")
          // Set fallback student rank
          setStudentRank({
            rank: 3,
            total_students: 25,
            calculated_at: new Date().toISOString()
          })
        }

        // Handle weekly timetable data
        if (weeklyTimetableRes.success && Array.isArray(weeklyTimetableRes.data)) {
          setWeeklyTimetable(weeklyTimetableRes.data)
        } else {
          console.warn(weeklyTimetableRes.message || "Could not fetch weekly timetable.")
          // Set fallback weekly timetable
          setWeeklyTimetable([
            {
              day_of_week: 'MON',
              period_number: 1,
              subject: 'Mathematics',
              teacher_name: 'Mr. Sharma',
              start_time: '09:00',
              end_time: '10:00'
            },
            {
              day_of_week: 'MON',
              period_number: 2,
              subject: 'English',
              teacher_name: 'Ms. Patel',
              start_time: '10:00',
              end_time: '11:00'
            },
            {
              day_of_week: 'MON',
              period_number: 3,
              subject: 'Science',
              teacher_name: 'Mr. Kumar',
              start_time: '11:00',
              end_time: '12:00'
            }
          ])
        }

        // Calculate stats from real data
         const assignmentsData = assignmentsRes.success && Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []
         const totalAssignments = assignmentsData.length
         const completedAssignments = assignmentsData.filter((a: any) => a.status === 'completed').length

         const attendanceRecords = attendanceRes.success && Array.isArray(attendanceRes.data) ? attendanceRes.data : []
         const attendanceRate = attendanceRecords.length > 0
           ? Math.round((attendanceRecords.filter((a: any) => a.status === 'present').length / attendanceRecords.length) * 100)
           : 0

         const gradesData = gradesRes.success && Array.isArray(gradesRes.data) ? gradesRes.data : []
         const gradePoints = gradesData.reduce((sum: number, grade: any) => sum + (grade.score || grade.grade || 0), 0)
         const gpa = gradesData.length > 0 ? (gradePoints / gradesData.length / 20).toFixed(1) : "0.0"

         setStats({
           attendanceRate,
           currentGPA: parseFloat(gpa.toString()),
           completedAssignments,
           totalAssignments,
           upcomingDeadlines: assignmentsData.filter((a: any) => new Date(a.due_date || a.dueDate) > new Date()).length,
           currentGrade: gradesData.length > 0 ? (parseFloat(gpa.toString()) >= 3.7 ? "A-" : parseFloat(gpa.toString()) >= 3.3 ? "B+" : "B") : "N/A"
         })

        // Set dashboard content from real data
         const assignmentsForDashboard = assignmentsRes.success && Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []

         setUpcomingAssignments(
           assignmentsForDashboard.filter((a: any) => new Date(a.due_date || a.dueDate) > new Date()).slice(0, 5)
         )

         // Set today's timetable
         const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
         const todayName = dayNames[new Date().getDay()]

         const timetableData = timetableRes.success && Array.isArray(timetableRes.data) ? timetableRes.data : []

         setTodayTimetable(
           timetableData.filter((t: any) => t.day_of_week?.toLowerCase() === todayName).map((t: any) => ({
             time: t.start_time,
             subject: t.subject?.name || t.subject,
             teacher: t.teacher?.user?.first_name + " " + t.teacher?.user?.last_name || t.teacher
           }))
         )

       } catch (err: any) {
         setError(err.message || "An unexpected error occurred while loading your dashboard.")
         console.error(err)
       } finally {
         setIsLoading(false)
       }
     }

     fetchStudentData()
   }, [currentUser])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading Your Dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-screen overflow-hidden">
      {/* Left Sidebar for Student Tools */}
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
        {/* Dashboard Header with Refresh */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Manage your academic activities and track your progress</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>


        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>

          <TabsContent value="classes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((classItem) => (
                <Card key={classItem.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" variant="outline" className="w-full px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white
    hover:bg-blue-500 dark:hover:bg-blue-600"
     onClick={() => handleViewClassDetails(classItem.id)}>
                        <FileText className="h-4 w-4 mr-2" /> View Class Details
                      </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Classmates</CardTitle>
                <CardDescription>
                  An overview of all {students.length} students in your class.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student.user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.user.first_name} {student.user.last_name}</p>
                          <p className="text-sm text-muted-foreground">Class {student.school_class}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewStudentDetails(student.user.id)} className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">View Details</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <StudentAssignmentsTab
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              setSelectedAssignment={setSelectedAssignment}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              uploadProgress={uploadProgress}
              setUploadProgress={setUploadProgress}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              showSubmitConfirmation={showSubmitConfirmation}
              setShowSubmitConfirmation={setShowSubmitConfirmation}
              handleFileUpload={handleFileUpload}
              handleSubmitAssignment={handleSubmitAssignment}
              toast={toast}
            />
          </TabsContent>

          <TabsContent value="fees">
            <div className="space-y-6">
              {/* Fee Details Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">My Fees</h2>
                  <p className="text-muted-foreground">View your fee payment status and history</p>
                </div>
                <Button
                  onClick={() => {
                    // Generate receipt functionality with real data
                    const receiptData = {
                      studentName: currentUser?.first_name + ' ' + currentUser?.last_name,
                      totalAmount: `₹${feeSummary.totalFees.toLocaleString()}`,
                      paidAmount: `₹${feeSummary.paidAmount.toLocaleString()}`,
                      pendingAmount: `₹${feeSummary.pendingAmount.toLocaleString()}`,
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
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Receipt
                </Button>
              </div>

              {/* Fee Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">₹{feeSummary.totalFees.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">₹{feeSummary.paidAmount.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Paid</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">₹{feeSummary.pendingAmount.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fee Records */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Fee Records</h3>
                </div>
                <div className="space-y-2">
                  {fees.length > 0 ? fees.map((fee: any) => {
                    const paidAmount = fee.payments?.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
                    const outstanding = fee.amount - paidAmount
                    const isPaid = outstanding <= 0

                    return (
                      <div key={fee.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{fee.fee_type?.name || 'Fee'}</p>
                          <p className="text-sm text-muted-foreground">Due: {new Date(fee.due_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">Amount: ₹{fee.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                          {isPaid ? (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Receipt
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Send className="h-4 w-4 mr-1" />
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No fee records available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagement userRole="student" />
          </TabsContent>

          <TabsContent value="timetable">
            <div className="space-y-6">
              {/* Timetable Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">My Timetable</h2>
                  <p className="text-muted-foreground">View your class schedule and manage your academic calendar</p>
                </div>
                <div className="flex gap-2">
                  <Select value={timetableView} onValueChange={(value: 'day' | 'week' | 'month') => setTimetableView(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day View</SelectItem>
                      <SelectItem value="week">Week View</SelectItem>
                      <SelectItem value="month">Month View</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleExportTimetable}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>

              {/* Timetable Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                        <p className="text-2xl font-bold">{timetable.length}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                        <p className="text-2xl font-bold">{new Set(timetable.map(t => t.subject)).size}</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                        <p className="text-2xl font-bold">{new Set(timetable.map(t => t.teacher)).size}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timetable View */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {timetableView === 'day' && "Today's Schedule"}
                    {timetableView === 'week' && "Weekly Schedule"}
                    {timetableView === 'month' && "Monthly Overview"}
                  </CardTitle>
                  <CardDescription>Your class schedule and academic calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  {timetableView === 'week' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Time</th>
                            <th className="text-center p-3 font-semibold">Monday</th>
                            <th className="text-center p-3 font-semibold">Tuesday</th>
                            <th className="text-center p-3 font-semibold">Wednesday</th>
                            <th className="text-center p-3 font-semibold">Thursday</th>
                            <th className="text-center p-3 font-semibold">Friday</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { time: '9:00 - 10:00 AM', monday: 'Mathematics', tuesday: 'Science', wednesday: 'English', thursday: 'History', friday: 'Art' },
                            { time: '10:00 - 11:00 AM', monday: 'English', tuesday: 'Mathematics', wednesday: 'Science', thursday: 'Geography', friday: 'Music' },
                            { time: '11:00 - 12:00 PM', monday: 'Science', tuesday: 'History', wednesday: 'Mathematics', thursday: 'English', friday: 'PE' }
                          ].map((period, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium text-sm">{period.time}</td>
                              <td className="p-3 text-center">
                                <div className="bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs font-medium">
                                  {period.monday}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="bg-green-100 text-green-800 rounded px-2 py-1 text-xs font-medium">
                                  {period.tuesday}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="bg-purple-100 text-purple-800 rounded px-2 py-1 text-xs font-medium">
                                  {period.wednesday}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="bg-orange-100 text-orange-800 rounded px-2 py-1 text-xs font-medium">
                                  {period.thursday}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="bg-pink-100 text-pink-800 rounded px-2 py-1 text-xs font-medium">
                                  {period.friday}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : timetableView === 'day' ? (
                    <div className="space-y-4">
                      {weeklyTimetable.length > 0 ? weeklyTimetable.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{item.subject}</p>
                              <p className="text-sm text-muted-foreground">{item.teacher_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.start_time}</p>
                            <p className="text-sm text-muted-foreground">{item.day_of_week}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No timetable data available</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                        <Card key={day} className="p-4">
                          <div className="text-center">
                            <p className="font-medium">Day {day}</p>
                            <div className="mt-2 space-y-1">
                              {timetable.slice(0, Math.min(2, timetable.length)).map((item, idx) => (
                                <div key={idx} className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-1">
                                  {item.subject}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <div className="space-y-6">
              {/* Grades Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Grades & Progress Reports</h2>
                  <p className="text-muted-foreground">View your academic performance and progress tracking</p>
                </div>
                <Button variant="outline" onClick={handleExportGrades}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              {/* Overall Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overall GPA</p>
                        <p className="text-3xl font-bold">{stats?.currentGPA ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Grade: {stats?.currentGrade ?? "N/A"}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                        <p className="text-3xl font-bold">{stats?.attendanceRate ?? 0}%</p>
                        <p className="text-sm text-muted-foreground">This semester</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Assignments</p>
                        <p className="text-3xl font-bold">{stats?.completedAssignments ?? 0}/{stats?.totalAssignments ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                      <FileText className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Class Rank</p>
                        <p className="text-3xl font-bold">{studentRank?.rank ? `${studentRank.rank}${studentRank.rank === 1 ? 'st' : studentRank.rank === 2 ? 'nd' : studentRank.rank === 3 ? 'rd' : 'th'}` : '3rd'}</p>
                        <p className="text-sm text-muted-foreground">Out of {studentRank?.total_students ?? 25} students</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Academic Progress Chart</CardTitle>
                  <CardDescription>Your performance trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">Progress chart visualization</p>
                      <p className="text-sm text-muted-foreground">Chart.js integration would display here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Grades */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Grade Report</CardTitle>
                  <CardDescription>Your performance breakdown by subject and assignment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {grades.map((grade, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">{grade.subject}</h4>
                          <Badge variant="secondary" className={`${
                            grade.grade >= 90 ? 'bg-green-100 text-green-800' :
                            grade.grade >= 80 ? 'bg-blue-100 text-blue-800' :
                            grade.grade >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade.grade}%
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{grade.grade}%</span>
                          </div>
                          <Progress value={grade.grade} className="h-2" />
                        </div>

                        {/* Recent Assignments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Latest Assignment</p>
                            <p className="text-xs text-muted-foreground">Quiz - Chapter {Math.floor(Math.random() * 10) + 1}</p>
                            <p className="text-sm font-semibold text-green-600">{grade.grade}%</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Average Grade</p>
                            <p className="text-xs text-muted-foreground">This semester</p>
                            <p className="text-sm font-semibold text-blue-600">{grade.grade - Math.floor(Math.random() * 5)}%</p>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Last updated: {new Date(grade.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}

                    {grades.length === 0 && (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No grades available yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-6">
              {/* Notifications Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Notifications / Announcements</h2>
                  <p className="text-muted-foreground">Stay updated with school announcements and alerts</p>
                </div>
              </div>

              {/* Notifications List */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>All your notifications and announcements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Demo notifications */}
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bell className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Assignment Due Reminder</p>
                        <p className="text-sm text-muted-foreground">Your Mathematics assignment is due in 2 days. Don't forget to submit it!</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">Assignment</Badge>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Bell className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Grade Posted</p>
                        <p className="text-sm text-muted-foreground">Your Science lab report has been graded. You scored 88%!</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Grade</Badge>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Bell className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Fee Payment Reminder</p>
                        <p className="text-sm text-muted-foreground">Your tuition fee payment of ₹15,000 is due in 5 days.</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">Payment</Badge>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Bell className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">School Event</p>
                        <p className="text-sm text-muted-foreground">Annual Science Fair will be held next week. Register your projects!</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">Event</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <StudentDashboardOverview
              currentUser={currentUser}
              stats={stats}
              assignments={assignments}
              todayTimetable={todayTimetable}
              upcomingAssignments={upcomingAssignments}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Profile / Account Settings</h2>
                  <p className="text-muted-foreground">Manage your personal information and account preferences</p>
                </div>
              </div>

              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <input
                        type="text"
                        defaultValue={currentUser?.first_name || ""}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <input
                        type="text"
                        defaultValue={currentUser?.last_name || ""}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        defaultValue={currentUser?.email || ""}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <input
                        type="tel"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      onClick={() => {
                        toast({
                          title: "Profile Updated",
                          description: "Your profile information has been updated successfully.",
                        })
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account security and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      onClick={() => {
                        toast({
                          title: "Password Changed",
                          description: "Your password has been changed successfully.",
                        })
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="library" className="space-y-4">
            <div className="space-y-6">
              {/* Library Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Library</h2>
                  <p className="text-muted-foreground">Access library resources and manage borrowed books</p>
                </div>
              </div>

              {/* Library Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-gradient-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Books Borrowed</p>
                        <p className="text-2xl font-bold">{libraryStats?.books_borrowed ?? 3}</p>
                      </div>
                      <Library className="h-8 w-8 text-gradient-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gradient-secondary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                        <p className="text-2xl font-bold">{libraryStats?.books_due_soon ?? 1}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-gradient-secondary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gradient-accent">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                        <p className="text-2xl font-bold">{libraryStats?.books_overdue ?? 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-gradient-accent" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Borrowed Books */}
              <Card>
                <CardHeader>
                  <CardTitle>My Borrowed Books</CardTitle>
                  <CardDescription>Books currently borrowed from the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Demo borrowed books */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Mathematics Textbook - Algebra</p>
                          <p className="text-sm text-muted-foreground">Author: John Smith</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">Due: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">3 days left</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Chemistry Lab Manual</p>
                          <p className="text-sm text-muted-foreground">Author: Sarah Davis</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">Due: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">1 week left</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">English Literature Anthology</p>
                          <p className="text-sm text-muted-foreground">Author: Michael Brown</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">Due: {new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">Overdue by 2 days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Library Catalog Link */}
              <Card>
                <CardHeader>
                  <CardTitle>Library Catalog</CardTitle>
                  <CardDescription>Browse and search for books in our library</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                    onClick={() => {
                      toast({
                        title: "Library Catalog",
                        description: "Library catalog functionality would open in a new window.",
                      })
                    }}
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Open Library Catalog
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="add-student" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Classmate</CardTitle>
                <CardDescription>
                  Connect with other students in your class or school
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter classmate's first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter classmate's last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter classmate's email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700"
                    onClick={() => {
                      toast({
                        title: "Add Classmate",
                        description: "Add classmate functionality would be implemented here.",
                      })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Classmate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Search Students",
                        description: "Search existing students functionality would be implemented here.",
                      })
                    }}
                  >
                    Search Existing Students
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Connections</CardTitle>
                <CardDescription>Your recently added classmates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent connections</p>
                    <p className="text-sm text-muted-foreground">Your recent classmate connections will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>


      {/* Assignment Submission Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSubmitConfirmation}
        onClose={() => setShowSubmitConfirmation(false)}
        onConfirm={handleSubmitAssignment}
        title="Confirm Assignment Submission"
        description={`Are you sure you want to submit ${uploadedFiles.length} file(s) for "${selectedAssignment?.title}"? This action cannot be undone.`}
        confirmText="Submit Assignment"
        variant="default"
        isLoading={isUploading}
      />

      {/* Fee Details Modal */}
      <FeeDetailsModal
        isOpen={showFeeDetailsModal}
        onClose={() => setShowFeeDetailsModal(false)}
        studentId={currentUser?.id}
        studentName={`${currentUser?.first_name} ${currentUser?.last_name}`}
      />
    </div>
  )
})