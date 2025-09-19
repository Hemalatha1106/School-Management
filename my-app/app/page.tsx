"use client"

import React from "react"
import { useAuth } from "@/lib/auth-context"
import { LoginForm } from "@/components/login-form"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Heart, Sparkles, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

// Import dashboard components directly (temporarily removing lazy loading to fix ChunkLoadError)
import PrincipalDashboard from "@/components/principal/principal-dashboard"
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard"
import { StudentDashboard } from "@/components/student/student-dashboard"

function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()

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

  if (!user) return null

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "principal":
        return "Welcome to your administrative dashboard"
      case "teacher":
        return "Welcome to your teaching dashboard"
      case "student":
        return "Welcome to your student portal"
      default:
        return "Welcome to your dashboard"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {user.role === "principal" && <PrincipalDashboard />}
          {user.role === "teacher" && <TeacherDashboard />}
          {user.role === "student" && <StudentDashboard />}
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-in">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full animate-ping"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading School Portal
            </h2>
            <p className="text-muted-foreground">Setting up your personalized dashboard...</p>
            <div className="flex justify-center mt-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginForm />
}
