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
  Library,
  Bell,
} from "lucide-react"

interface StudentStats {
  attendanceRate: number
  currentGPA: number
  completedAssignments: number
  totalAssignments: number
  upcomingDeadlines: number
  currentGrade: string
}

interface StudentDashboardOverviewProps {
  stats: StudentStats | null
  assignments: any[]
  upcomingAssignments: any[]
  todayTimetable: any[]
  libraryStats: any
  studentRank: any
  feeSummary: {
    totalFees: number
    paidAmount: number
    pendingAmount: number
  }
  isLoading: boolean
  setActiveTab: (tab: string) => void
}

export default function StudentDashboardOverview({
  stats,
  assignments,
  upcomingAssignments,
  todayTimetable,
  libraryStats,
  studentRank,
  feeSummary,
  isLoading,
  setActiveTab
}: StudentDashboardOverviewProps) {
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Current GPA</CardTitle>
            <BarChart3 className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.currentGPA ?? 0}
            </div>
            <p className="text-xs text-white/70 font-medium">Grade: {stats?.currentGrade ?? 'N/A'}</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Attendance Rate</CardTitle>
            <Users className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.attendanceRate ?? 0}%
            </div>
            <p className="text-xs text-white/70 font-medium">This semester</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Pending Assignments</CardTitle>
            <Clock className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {pendingAssignments}
            </div>
            <p className="text-xs text-white/70 font-medium">Due soon</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Today's Classes</CardTitle>
            <Calendar className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {todayTimetable.length}
            </div>
            <p className="text-xs text-white/70 font-medium">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Assignments
            </CardTitle>
            <CardDescription>Your latest assignments and submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.length > 0 ? (
                assignments.slice(0, 3).map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{assignment.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={assignment.status === 'completed' ? 'secondary' : 'outline'} className={assignment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {assignment.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent assignments</p>
              )}
            </div>
            {assignments.length > 3 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("assignments")}>
                  View All Assignments ({assignments.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Timetable */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTimetable.length > 0 ? (
                todayTimetable.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">{item.teacher}</p>
                    </div>
                    <span className="text-sm font-medium">{item.time}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("timetable")}>
                View Full Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fee Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fee Status
            </CardTitle>
            <CardDescription>Your current fee payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Fees</span>
                <span className="font-semibold">₹{feeSummary.totalFees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Paid</span>
                <span className="font-semibold text-green-600">₹{feeSummary.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">Pending</span>
                <span className="font-semibold text-orange-600">₹{feeSummary.pendingAmount.toLocaleString()}</span>
              </div>
              <Progress
                value={(feeSummary.paidAmount / feeSummary.totalFees) * 100}
                className="h-2"
              />
              <div className="text-center">
                <span className="text-xs text-muted-foreground">
                  {Math.round((feeSummary.paidAmount / feeSummary.totalFees) * 100)}% Paid
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("fees")}>
                View Fee Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Library Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Library Status
            </CardTitle>
            <CardDescription>Your current library activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Books Borrowed</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {libraryStats?.books_borrowed ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">Due Soon</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {libraryStats?.books_due_soon ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-600">Overdue</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {libraryStats?.books_overdue ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Class Rank</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  #{studentRank?.rank ?? 'N/A'}
                </Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("library")}>
                Visit Library
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common student tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center gap-2"
              onClick={() => setActiveTab("assignments")}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Submit Assignment</span>
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
              onClick={() => setActiveTab("grades")}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Check Grades</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center gap-2"
              onClick={() => setActiveTab("notifications")}
            >
              <Bell className="h-5 w-5" />
              <span className="text-xs">Notifications</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}