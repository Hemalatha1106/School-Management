"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Users,
  BookOpen,
  FileText,
  Settings,
  Calendar,
  GraduationCap,
  DollarSign,
} from "lucide-react"

interface PrincipalSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function PrincipalSidebar({ activeTab, setActiveTab }: PrincipalSidebarProps) {
  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0 animate-slide-up max-h-screen overflow-y-auto">
      <Card className="h-full backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border border-white/60 dark:border-slate-200/20 shadow-xl">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
          <CardTitle className="text-lg font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            Principal Tools
          </CardTitle>
          <CardDescription className="text-sm font-medium">
            School Administration
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-300 border-2 hover:border-blue-300 dark:hover:border-blue-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("overview")}
            >
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">School Overview</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-2 hover:border-green-300 dark:hover:border-green-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("teachers")}
            >
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Teachers</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-300 border-2 hover:border-purple-300 dark:hover:border-purple-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("students")}
            >
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Students</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 dark:hover:from-orange-900/20 dark:hover:to-yellow-900/20 transition-all duration-300 border-2 hover:border-orange-300 dark:hover:border-orange-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("classes")}
            >
              <BookOpen className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Classes</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 transition-all duration-300 border-2 hover:border-red-300 dark:hover:border-red-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("reports")}
            >
              <FileText className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Reports</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 dark:hover:from-teal-900/20 dark:hover:to-cyan-900/20 transition-all duration-300 border-2 hover:border-teal-300 dark:hover:border-teal-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium">User Management</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 transition-all duration-300 border-2 hover:border-emerald-300 dark:hover:border-emerald-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("salary")}
            >
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Salary Management</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-lime-50 hover:to-emerald-50 dark:hover:from-lime-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-2 hover:border-lime-300 dark:hover:border-lime-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("teacher-fees")}
            >
              <DollarSign className="h-4 w-4 text-lime-600" />
              <span className="text-sm font-medium">Teacher Fees</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all duration-300 border-2 hover:border-emerald-300 dark:hover:border-emerald-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("fee-management")}
            >
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Fee Management</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50 dark:hover:from-cyan-900/20 dark:hover:to-teal-900/20 transition-all duration-300 border-2 hover:border-cyan-300 dark:hover:border-cyan-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("timetables")}
            >
              <Calendar className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-medium">All Timetables</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-3 justify-start m-2 bg-white/10 dark:bg-white/5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-900/20 dark:hover:to-blue-900/20 transition-all duration-300 border-2 hover:border-indigo-300 dark:hover:border-indigo-600 font-medium text-black dark:text-white hover:text-black"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}