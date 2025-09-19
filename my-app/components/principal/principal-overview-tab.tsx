"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Loader2 } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

interface SchoolStats {
  total_students: number
  total_teachers: number
  total_classes: number
  total_users: number
  active_users: number
  monthly_payroll: number
  pending_payments: number
  paid_this_month: number
}

interface PrincipalOverviewTabProps {
  schoolStats: SchoolStats | null
  isLoading: boolean
  attendanceData: any[]
  studentFeeStatusData: any[]
  cgpaData: any[]
  chartConfig: any
}

export default function PrincipalOverviewTab({
  schoolStats,
  isLoading,
  attendanceData,
  studentFeeStatusData,
  cgpaData,
  chartConfig
}: PrincipalOverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {/* School Stats Cards */}
        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Students</CardTitle>
            <div className="h-5 w-5 text-white/80">👥</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Loading</span>
                </div>
              ) : (
                schoolStats?.total_students || 0
              )}
            </div>
            <p className="text-xs text-white/70 font-medium">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Classes</CardTitle>
            <div className="h-5 w-5 text-white/80">📚</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Loading</span>
                </div>
              ) : (
                schoolStats?.total_classes || 0
              )}
            </div>
            <p className="text-xs text-white/70 font-medium">Active classes</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Teachers</CardTitle>
            <div className="h-5 w-5 text-white/80">👨‍🏫</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Loading</span>
                </div>
              ) : (
                schoolStats?.total_teachers || 0
              )}
            </div>
            <p className="text-xs text-white/70 font-medium">Teaching staff</p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Monthly Revenue</CardTitle>
            <div className="h-5 w-5 text-white/80">💰</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-white mb-1">₹2.4L</div>
            <p className="text-xs text-white/70 font-medium">Fee collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 overflow-hidden">
        {/* Student Attendance Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Student Attendance Overview</CardTitle>
            <CardDescription>Daily attendance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {attendanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Fee Payment Status Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Student Fee Payment Status</CardTitle>
            <CardDescription>Paid, Pending, and Overdue Fees</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <PieChart>
                <Pie
                  data={studentFeeStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {studentFeeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {studentFeeStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CGPA Distribution Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">CGPA Distribution</CardTitle>
            <CardDescription>Student Performance Overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={cgpaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              {cgpaData.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.range}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}