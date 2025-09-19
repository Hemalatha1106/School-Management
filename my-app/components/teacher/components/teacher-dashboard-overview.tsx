"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
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

interface TeacherStats {
  total_classes: number
  total_students: number
  totalAssignments?: number
  completedAssignments?: number
}

interface TeacherDashboardOverviewProps {
  stats: TeacherStats | null
  classes: any[]
  students: any[]
  tasks: any[]
  todayTasks: any[]
  isLoading: boolean
  handleViewClassDetails: (classId: number) => void
  handleViewStudentDetails: (studentId: number) => void
  handleMarkTaskCompleted: (taskId: number) => void
  handleMarkTaskInProgress: (taskId: number) => void
  setActiveTab: (tab: string) => void
}

export default function TeacherDashboardOverview({
  stats,
  classes,
  students,
  tasks,
  todayTasks,
  isLoading,
  handleViewClassDetails,
  handleViewStudentDetails,
  handleMarkTaskCompleted,
  handleMarkTaskInProgress,
  setActiveTab
}: TeacherDashboardOverviewProps) {
  const pendingAssignments = React.useMemo(() => {
    return (stats?.totalAssignments ?? 0) - (stats?.completedAssignments ?? 0)
  }, [stats?.totalAssignments, stats?.completedAssignments])

  const completionRate = React.useMemo(() => {
    if (!stats?.totalAssignments) return 0
    return Math.round(((stats.completedAssignments ?? 0) / stats.totalAssignments) * 100)
  }, [stats?.completedAssignments, stats?.totalAssignments])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading Your Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Classes</CardTitle>
            <BookOpen className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.total_classes || 0}
            </div>
            <p className="text-xs text-white/70 font-medium">Classes you teach</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Students</CardTitle>
            <Users className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.total_students || 0}
            </div>
            <p className="text-xs text-white/70 font-medium">Students enrolled</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Pending Tasks</CardTitle>
            <Clock className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {tasks.filter(t => t.status === 'pending').length}
            </div>
            <p className="text-xs text-white/70 font-medium">Tasks to complete</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Today's Tasks</CardTitle>
            <CheckCircle className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {todayTasks.length}
            </div>
            <p className="text-xs text-white/70 font-medium">Due today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Classes
            </CardTitle>
            <CardDescription>Classes you are currently teaching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classes.length > 0 ? (
                classes.slice(0, 3).map((classItem) => (
                  <div key={classItem.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{classItem.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {students.filter(s => s.school_class === classItem.name.replace('Class ', '').split('-')[0]).length} students
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewClassDetails(classItem.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No classes assigned</p>
              )}
            </div>
            {classes.length > 3 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("classes")}>
                  View All Classes ({classes.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Tasks
            </CardTitle>
            <CardDescription>Tasks and assignments due today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTasks.length > 0 ? (
                todayTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'} className={task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {task.status}
                      </Badge>
                      {task.status !== 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkTaskCompleted(task.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tasks due today</p>
              )}
            </div>
            {todayTasks.length > 3 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("tasks")}>
                  View All Tasks ({todayTasks.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Students
            </CardTitle>
            <CardDescription>Students you've recently interacted with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.length > 0 ? (
                students.slice(0, 3).map((student) => (
                  <div key={student.user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{student.user.first_name} {student.user.last_name}</p>
                        <p className="text-xs text-muted-foreground">{student.school_class}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewStudentDetails(student.user.id)}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No students found</p>
              )}
            </div>
            {students.length > 3 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("students")}>
                  View All Students ({students.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common teaching tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setActiveTab("assignments")}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">New Assignment</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setActiveTab("attendance")}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Take Attendance</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setActiveTab("timetable")}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs">View Schedule</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setActiveTab("leave")}
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs">Apply Leave</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}