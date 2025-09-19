"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  Heart,
  Settings,
  Download,
  Eye,
  Calendar,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Target,
  Award,
  UserCheck,
  X,
  Minus,
} from "lucide-react"
import { LeaveManagement } from "../student/leave-management"
import { TimetableManagement } from "../student/timetable-management"
import { FeesManagement } from "../student/fees-management"
import { TeacherFeesStructure } from "./teacher-fees-structure"
import TeacherSidebar from "./components/teacher-sidebar"
import TeacherDashboardOverview from "./components/teacher-dashboard-overview"
import TeacherClassesTab from "./components/teacher-classes-tab"
import TeacherStudentsTab from "./components/teacher-students-tab"
import * as XLSX from 'xlsx'

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

interface TeacherStats {
  total_classes: number
  total_students: number
}

export function TeacherDashboard() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard") // <-- Set default to "dashboard"

  const handleHealthCheck = async () => {
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
  }

  const handleViewClassDetails = async (classId: number) => {
    try {
      const response = await api.classes.details(classId)
      const classData = classes.find(c => c.id === classId)

      if (classData) {
        // Calculate actual student count for this class
        const classGrade = classData.name.replace('Class ', '').split('-')[0]
        const actualStudentCount = students.filter(s => s.school_class === classGrade).length

        console.log('Class Details Calculation:', {
          className: classData.name,
          classGrade,
          totalStudentsInSystem: students.length,
          filteredStudents: students.filter(s => s.school_class === classGrade),
          actualStudentCount
        })

        let classDetails = {
          ...classData,
          total_students: actualStudentCount,
          teacher: { first_name: 'You', last_name: '' },
          attendance_rate: 85,
          average_gpa: 3.5
        }

        if (response.success && response.data) {
          const data = response.data as any
          classDetails = {
            ...classData,
            total_students: data.total_students || actualStudentCount,
            teacher: data.teacher || classDetails.teacher,
            attendance_rate: data.attendance_rate || classDetails.attendance_rate,
            average_gpa: data.average_gpa || classDetails.average_gpa
          }
        }

        console.log('Final classDetails object:', classDetails)
        setSelectedClass(classDetails as any)
        setSelectedClassId(classId)
        setShowClassDetailsModal(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Class not found.",
        })
      }
    } catch (error: any) {
      console.error('Error loading class details:', error)
      // Still show the modal with basic class information
      const classData = classes.find(c => c.id === classId)
      if (classData) {
        // Calculate actual student count for this class
        const classGrade = classData.name.replace('Class ', '').split('-')[0]
        const actualStudentCount = students.filter(s => s.school_class === classGrade).length

        setSelectedClass({
          ...classData,
          total_students: actualStudentCount,
          teacher: { first_name: 'You', last_name: '' },
          attendance_rate: 85,
          average_gpa: 3.5
        } as any)
        setSelectedClassId(classId)
        setShowClassDetailsModal(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load class details.",
        })
      }
    }
  }

  const handleCloseClassDetailsModal = () => {
    setShowClassDetailsModal(false)
    setSelectedClassId(null)
    setSelectedClass(null)
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

  const handleMarkTaskCompleted = async (taskId: number) => {
    try {
      const response = await api.tasks.markCompleted(taskId)
      if (response.success) {
        toast({
          title: "Task Completed",
          description: "Task has been marked as completed!",
        })
        // Refresh tasks
        const tasksRes = await api.tasks.list()
        const todayTasksRes = await api.tasks.todayTasks()
        if (tasksRes.success) setTasks(tasksRes.data as any[])
        if (todayTasksRes.success) setTodayTasks(todayTasksRes.data as any[])
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task.",
      })
    }
  }

  const handleMarkTaskInProgress = async (taskId: number) => {
    try {
      const response = await api.tasks.markInProgress(taskId)
      if (response.success) {
        toast({
          title: "Task Updated",
          description: "Task has been marked as in progress!",
        })
        // Refresh tasks
        const tasksRes = await api.tasks.list()
        const todayTasksRes = await api.tasks.todayTasks()
        if (tasksRes.success) setTasks(tasksRes.data as any[])
        if (todayTasksRes.success) setTodayTasks(todayTasksRes.data as any[])
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task.",
      })
    }
  }

  // --- State for Live API Data ---
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<StudentFromAPI[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false)
      return
    }

    const fetchTeacherData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch classes first
        const classesRes = await api.teachers.classes(currentUser.id)
        if (classesRes.success && Array.isArray(classesRes.data)) {
          setClasses(classesRes.data)
        } else {
          throw new Error(classesRes.message || "Failed to fetch your classes.")
        }

        // Fetch students taught by this teacher using the dedicated endpoint
        let studentsData: StudentFromAPI[] = []
        try {
          const teacherStudentsRes = await api.teachers.students(currentUser.id)
          if (teacherStudentsRes.success && Array.isArray(teacherStudentsRes.data)) {
            studentsData = teacherStudentsRes.data
          }
        } catch (error) {
          console.warn('Failed to fetch students via teacher endpoint, trying alternative methods')

          // Fallback: try to get all students and filter by teacher's classes
          try {
            const allStudentsRes = await api.students.list()
            if (allStudentsRes.success && Array.isArray(allStudentsRes.data)) {
              // Filter students by the classes this teacher teaches
              const teacherClassNames = classesRes.data.map((cls: any) => cls.name)
              studentsData = allStudentsRes.data.filter((student: any) =>
                teacherClassNames.includes(student.school_class)
              )
            }
          } catch (error2) {
            console.warn('Failed to fetch students via students.list(), trying class-specific endpoints')
          }

          // If still no students found, try fetching from each class
          if (studentsData.length === 0 && classesRes.data.length > 0) {
            try {
              const studentPromises = classesRes.data.map((cls: any) =>
                api.classes.students(cls.id)
              )
              const studentResults = await Promise.all(studentPromises)

              studentsData = studentResults
                .filter(result => result.success && Array.isArray(result.data))
                .flatMap(result => result.data as StudentFromAPI[])
            } catch (error3) {
              console.warn('Failed to fetch students via class endpoints')
            }
          }
        }

        setStudents(studentsData)

        // Fetch tasks
        try {
          const [tasksRes, todayTasksRes] = await Promise.all([
            api.tasks.list(),
            api.tasks.todayTasks(),
          ])

          if (tasksRes.success && Array.isArray(tasksRes.data)) {
            setTasks(tasksRes.data as any[])
          }

          if (todayTasksRes.success && Array.isArray(todayTasksRes.data)) {
            setTodayTasks(todayTasksRes.data as any[])
          }
        } catch (error) {
          console.warn('Failed to fetch tasks:', error)
          setTasks([])
          setTodayTasks([])
        }

        // Calculate stats based on the fetched data
        setStats({
          total_classes: classesRes.data.length,
          total_students: studentsData.length,
        })

        console.log('Teacher data loaded:', {
          classes: classesRes.data.length,
          students: studentsData.length,
          tasks: tasks?.length || 0,
          todayTasks: todayTasks?.length || 0
        })
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while loading your dashboard.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeacherData()
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
      {/* Left Sidebar for Management Links */}
      <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
        {/* Dashboard Header with Refresh */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Manage your classes, students, and teaching activities</p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <TabsContent value="dashboard" className="space-y-4">
            <TeacherDashboardOverview
              stats={stats}
              classes={classes}
              students={students}
              tasks={tasks}
              todayTasks={todayTasks}
              isLoading={isLoading}
              setActiveTab={setActiveTab}
              handleViewClassDetails={handleViewClassDetails}
              handleViewStudentDetails={handleViewStudentDetails}
              handleMarkTaskCompleted={handleMarkTaskCompleted}
              handleMarkTaskInProgress={handleMarkTaskInProgress}
            />
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <TeacherClassesTab
              classes={classes}
              students={students}
              handleViewClassDetails={handleViewClassDetails}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <TeacherStudentsTab
              students={students}
              classes={classes}
              handleViewStudentDetails={handleViewStudentDetails}
              handleSendMessage={(userId, userType) => {
                const user = students.find(s => s.user.id === userId)?.user
                if (user) {
                  toast({
                    title: `Send Message to ${user.first_name} ${user.last_name}`,
                    description: `Role: ${userType}`,
                  })
                }
              }}
            />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Attendance Management</h2>
                <p className="text-muted-foreground">Take attendance and view attendance reports for your classes</p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Take Attendance
                </Button>
                <Button variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Attendance Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-teal-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Today's Attendance</p>
                      <p className="text-2xl font-bold text-teal-600">87%</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-teal-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                      <p className="text-2xl font-bold text-green-600">156</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                      <p className="text-2xl font-bold text-orange-600">8</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Absent Today</p>
                      <p className="text-2xl font-bold text-red-600">22</p>
                    </div>
                    <X className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Class-wise Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Class-wise Attendance</CardTitle>
                <CardDescription>Attendance overview for each of your classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classes.map((classItem) => {
                    const classGrade = classItem.name.replace('Class ', '').split('-')[0]
                    const classStudents = students.filter(s => s.school_class === classGrade)
                    const presentCount = Math.floor(classStudents.length * 0.87) // Mock data
                    const absentCount = classStudents.length - presentCount

                    return (
                      <div key={classItem.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-full">
                            <BookOpen className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{classItem.name}</h4>
                            <p className="text-sm text-muted-foreground">{classStudents.length} students</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm font-medium text-green-600">{presentCount} Present</p>
                            <p className="text-sm font-medium text-red-600">{absentCount} Absent</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-4 py-2 rounded-lg text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-teal-500 dark:hover:bg-teal-600"
                            onClick={() => {
                              toast({
                                title: "Take Attendance",
                                description: `Taking attendance for ${classItem.name}`,
                              })
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Take Attendance
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Attendance Records */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance Records</CardTitle>
                <CardDescription>Latest attendance entries across all your classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* TODO: Fetch real attendance records from API */}
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent attendance records found</p>
                    <p className="text-sm">Attendance data will appear here once students are marked present/absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-teal-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Bulk Attendance",
                        description: "Mark all students as present for emergency situations",
                      })
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark All Present (Emergency)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Attendance Report",
                        description: "Generate detailed attendance report",
                      })
                    }}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Attendance Settings",
                        description: "Configure attendance rules and notifications",
                      })
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Attendance Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Attendance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Low Attendance Alert</p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">Class 9-B has 15% absent rate this week</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Reminder</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">Don't forget to take attendance for Period 1</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Task Management</h2>
                <p className="text-muted-foreground">Manage your teaching tasks and track progress</p>
              </div>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Task
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Tasks</CardTitle>
                  <CardDescription>
                    Tasks scheduled for today ({todayTasks.length} tasks)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayTasks.length > 0 ? (
                      todayTasks.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'secondary' : 'outline'}>
                                {task.priority_display}
                              </Badge>
                              <Badge variant="outline">{task.task_type_display}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {task.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkTaskInProgress(task.id)}>
                                Start
                              </Button>
                            )}
                            {task.status !== 'completed' && (
                              <Button size="sm" variant="default" onClick={() => handleMarkTaskCompleted(task.id)}>
                                Complete
                              </Button>
                            )}
                            {task.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No tasks for today! 🎉</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>
                    Overview of all your tasks ({tasks.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tasks.length > 0 ? (
                      tasks.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">Due: {task.due_date}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'}>
                                {task.status_display}
                              </Badge>
                              <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'secondary' : 'outline'}>
                                {task.priority_display}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {task.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkTaskInProgress(task.id)}>
                                Start
                              </Button>
                            )}
                            {task.status !== 'completed' && (
                              <Button size="sm" variant="default" onClick={() => handleMarkTaskCompleted(task.id)}>
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No tasks found. Create your first task!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments">
            <div className="space-y-6">
              {/* Assignment Management Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Assignment Management</h2>
                  <p className="text-muted-foreground">Create and manage assignments for your classes</p>
                </div>
                <Button className="bg-gradient-to-r from-gradient-primary to-gradient-secondary hover:from-gradient-primary/90 hover:to-gradient-secondary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </div>

              {/* Assignment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-gradient-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                        <p className="text-2xl font-bold">12</p>
                      </div>
                      <FileText className="h-8 w-8 text-gradient-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gradient-secondary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Submissions</p>
                        <p className="text-2xl font-bold">8</p>
                      </div>
                      <Clock className="h-8 w-8 text-gradient-secondary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gradient-accent">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Graded</p>
                        <p className="text-2xl font-bold">4</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-gradient-accent" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Assignments</CardTitle>
                  <CardDescription>Manage assignments across all your classes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* TODO: Fetch real assignments from API */}
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No assignments found</p>
                      <p className="text-sm">Create your first assignment to get started</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>Latest assignment submissions from students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">John Doe</p>
                          <p className="text-sm text-muted-foreground">Mathematics Chapter 5 - Algebra</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Submitted 2h ago</Badge>
                        <Button variant="outline" size="sm" className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-gradient-primary to-gradient-secondary">
                          Grade
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Sarah Miller</p>
                          <p className="text-sm text-muted-foreground">Science Lab Report - Chemical Reactions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Submitted 4h ago</Badge>
                        <Button variant="outline" size="sm" className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-gradient-primary to-gradient-secondary">
                          Grade
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>RJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Robert Johnson</p>
                          <p className="text-sm text-muted-foreground">English Literature Essay</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Submitted 6h ago</Badge>
                        <Button variant="outline" size="sm" className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-gradient-primary to-gradient-secondary">
                          Grade
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagement userRole="teacher" />
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Reimbursements</h2>
                <p className="text-muted-foreground">Request and track reimbursement approvals</p>
              </div>
              <Button className="bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Request Reimbursement
              </Button>
            </div>

            {/* Reimbursement Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Requested</p>
                      <p className="text-2xl font-bold text-blue-600">₹12,500</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                      <p className="text-2xl font-bold text-orange-600">₹3,200</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold text-green-600">₹8,300</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid</p>
                      <p className="text-2xl font-bold text-purple-600">₹6,800</p>
                    </div>
                    <Send className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reimbursement Requests */}
            <Card>
              <CardHeader>
                <CardTitle>My Reimbursement Requests</CardTitle>
                <CardDescription>Track the status of your reimbursement requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* TODO: Fetch real reimbursements from API */}
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No reimbursement requests found</p>
                    <p className="text-sm">Submit your first reimbursement request to get started</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reimbursement Types */}
            <Card>
              <CardHeader>
                <CardTitle>Available Reimbursement Types</CardTitle>
                <CardDescription>Types of expenses you can claim reimbursement for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="font-semibold">Travel Expenses</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Expenses for travel related to school activities</p>
                    <Badge variant="outline">Max: ₹5,000</Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <BookOpen className="h-4 w-4 text-green-600" />
                      </div>
                      <h4 className="font-semibold">Stationery</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Teaching materials and stationery purchases</p>
                    <Badge variant="outline">Max: ₹2,000</Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="font-semibold">Professional Development</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Courses, workshops, and certifications</p>
                    <Badge variant="outline">Max: ₹10,000</Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                        <Heart className="h-4 w-4 text-red-600" />
                      </div>
                      <h4 className="font-semibold">Medical Expenses</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Medical checkups and health-related costs</p>
                    <Badge variant="outline">Max: ₹15,000</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable">
            <TimetableManagement userRole="teacher" />
          </TabsContent>

          <TabsContent value="grades" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Grade Management</h2>
                <p className="text-muted-foreground">Review and grade student assignments and submissions</p>
              </div>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Quick Grade All
              </Button>
            </div>

            {/* Grade Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Grades</p>
                      <p className="text-2xl font-bold text-blue-600">24</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Graded Today</p>
                      <p className="text-2xl font-bold text-green-600">8</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                      <p className="text-2xl font-bold text-orange-600">85%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Late Submissions</p>
                      <p className="text-2xl font-bold text-purple-600">3</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions to Grade */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Latest assignment submissions awaiting your grading</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample submission items */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">John Doe</p>
                        <p className="text-sm text-muted-foreground">Mathematics Chapter 5 - Algebra</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">Submitted 2h ago</Badge>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Pending</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="px-4 py-2 rounded-lg text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-blue-500 dark:hover:bg-blue-600">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Grade
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Sarah Miller</p>
                        <p className="text-sm text-muted-foreground">Science Lab Report - Chemical Reactions</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">Submitted 4h ago</Badge>
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Late</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="px-4 py-2 rounded-lg text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-blue-500 dark:hover:bg-blue-600">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Grade
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>RJ</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Robert Johnson</p>
                        <p className="text-sm text-muted-foreground">English Literature Essay</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">Submitted 6h ago</Badge>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Pending</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="px-4 py-2 rounded-lg text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-blue-500 dark:hover:bg-blue-600">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Grade
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Class Details Modal */}
      <Dialog open={showClassDetailsModal} onOpenChange={handleCloseClassDetailsModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              {selectedClass?.name} - Class Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive overview of class performance, students, and key metrics
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-6">
              {/* Class Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold text-blue-600">{(selectedClass as any).total_students || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                        <p className="text-2xl font-bold text-green-600">{(selectedClass as any).attendance_rate || 85}%</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average GPA</p>
                        <p className="text-2xl font-bold text-purple-600">{(selectedClass as any).average_gpa || 3.5}</p>
                      </div>
                      <Award className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Grade Level</p>
                        <p className="text-2xl font-bold text-orange-600">{selectedClass.name.replace('Class ', '')}</p>
                      </div>
                      <GraduationCap className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Class Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      Class Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Class Name</p>
                        <p className="font-semibold">{selectedClass.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Grade Level</p>
                        <p className="font-semibold">Grade {selectedClass.name.replace('Class ', '')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                        <p className="font-semibold">
                          {(selectedClass as any).total_students || 0}
                          <span className="text-xs text-muted-foreground ml-1">
                            (calculated)
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Class Teacher</p>
                        <p className="font-semibold">
                          {(selectedClass as any).teacher?.first_name && (selectedClass as any).teacher?.last_name
                            ? `${(selectedClass as any).teacher.first_name} ${(selectedClass as any).teacher.last_name}`
                            : 'You'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Attendance Rate</span>
                        <div className="flex items-center gap-2">
                          <Progress value={(selectedClass as any).attendance_rate || 85} className="w-20" />
                          <span className="text-sm font-semibold">{(selectedClass as any).attendance_rate || 85}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average GPA</span>
                        <span className="text-sm font-semibold">{(selectedClass as any).average_gpa || 3.5}/4.0</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Assignment Completion</span>
                        <span className="text-sm font-semibold">78%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Test Performance</span>
                        <span className="text-sm font-semibold">82%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Students in {selectedClass.name}
                  </CardTitle>
                  <CardDescription>
                    {(selectedClass as any).total_students || 0} students enrolled
                    <span className="text-xs text-muted-foreground block mt-1">
                      Debug: Total students in system: {students.length} |
                      Filtered by grade: {(() => {
                        const classGrade = selectedClass.name.replace('Class ', '').split('-')[0]
                        return students.filter(s => s.school_class === classGrade).length
                      })()}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {students
                      .filter(student => {
                        const classGrade = selectedClass.name.replace('Class ', '').split('-')[0]
                        return student.school_class === classGrade
                      })
                      .map((student) => (
                        <div key={student.user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.user.first_name} {student.user.last_name}</p>
                              <p className="text-sm text-muted-foreground">ID: {student.user.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => handleViewStudentDetails(student.user.id)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    {students.filter(student => student.school_class === selectedClass.name.replace('Class ', '')).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No students found in this class</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Generate and download class report
                    const reportData = [
                      ["Class Report"],
                      ["School: Springfield High School"],
                      ["Generated: " + new Date().toLocaleDateString()],
                      [""],
                      ["Class Information"],
                      ["Name", selectedClass.name],
                      ["Grade Level", selectedClass.name.replace('Class ', '')],
                      ["Total Students", (selectedClass as any).total_students || 0],
                      ["Class Teacher", (selectedClass as any).teacher?.first_name && (selectedClass as any).teacher?.last_name
                        ? `${(selectedClass as any).teacher.first_name} ${(selectedClass as any).teacher.last_name}`
                        : 'You'],
                      ["Attendance Rate", `${(selectedClass as any).attendance_rate || 85}%`],
                      ["Average GPA", (selectedClass as any).average_gpa || 3.5],
                      [""],
                      ["Students List"],
                      ["Name", "Status"],
                      ...students
                        .filter(student => {
                          const classGrade = selectedClass.name.replace('Class ', '').split('-')[0]
                          return student.school_class === classGrade
                        })
                        .map(student => [student.user.first_name + ' ' + student.user.last_name, 'Active']),
                      [""],
                      ["Generated by School Management System"]
                    ]

                    const wb = XLSX.utils.book_new()
                    const ws = XLSX.utils.aoa_to_sheet(reportData)
                    ws['!cols'] = [
                      { wch: 25 }, { wch: 15 }
                    ]
                    XLSX.utils.book_append_sheet(wb, ws, "Class Report")
                    XLSX.writeFile(wb, `Class_${selectedClass.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`)

                    toast({
                      title: "Report Generated",
                      description: `Class report for ${selectedClass.name} downloaded successfully`
                    })
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Class Report
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Close modal and navigate to timetable tab
                    setShowClassDetailsModal(false)
                    setActiveTab('timetable')
                    toast({
                      title: "Navigating to Schedule",
                      description: `Viewing schedule for ${selectedClass.name}`
                    })
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Close modal and navigate to assignments tab
                    setShowClassDetailsModal(false)
                    setActiveTab('assignments')
                    toast({
                      title: "Navigating to Assignments",
                      description: `Managing assignments for ${selectedClass.name}`
                    })
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Assignments
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseClassDetailsModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}