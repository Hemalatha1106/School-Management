"use client"

import { ThemeToggle } from "./theme-provider"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { GraduationCap, LogOut, Bell, AlertCircle, Calendar, DollarSign } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useState } from "react"

export function Header() {
  const { user, logout } = useAuth()
  const [unreadNotifications] = useState(3) // Mock unread count

  const handleLogout = async () => {
    await logout()
  }

  const handleNotificationClick = () => {
    // For now, just show a toast or could navigate to notifications tab
    // This would be implemented with proper routing later
    console.log("Notification clicked")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-700/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gradient-primary to-gradient-secondary shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gradient-primary via-gradient-secondary to-gradient-primary bg-clip-text text-transparent">
                School Portal
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Management System
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold bg-gradient-to-r from-gradient-primary to-gradient-secondary bg-clip-text text-transparent">
                Portal
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user && (
            <div className="hidden md:flex items-center space-x-3 text-sm bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground text-xs">Welcome,</span>
              </div>
              <span className="font-semibold text-foreground">{user.first_name} {user.last_name}</span>
              <span className="text-xs bg-gradient-to-r from-gradient-primary to-gradient-secondary text-white px-2 py-1 rounded-full font-medium shadow-sm">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {user && user.role === "student" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative flex items-center space-x-2 border-2 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-400 transition-all duration-300 font-medium text-yellow-600 dark:text-yellow-400"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    <p className="text-sm text-muted-foreground">You have {unreadNotifications} unread notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">School Holiday Notice</p>
                          <p className="text-xs text-muted-foreground">School closed Dec 25th</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Exam Schedule Update</p>
                          <p className="text-xs text-muted-foreground">Final exams rescheduled</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Fee Payment Reminder</p>
                          <p className="text-xs text-muted-foreground">Due by Dec 31st</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Notifications
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <ThemeToggle />

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 border-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 transition-all duration-300 font-medium text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}