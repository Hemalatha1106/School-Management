"use client"

import { FeesManagement } from "@/components/student/fees-management"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Home, LogOut } from "lucide-react"

export default function FeesPage() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <FeesManagement userRole="principal" />
      </div>
    </div>
  )
}