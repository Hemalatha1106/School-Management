"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, FileText, Plus, Check, X, Eye, Loader2 } from "lucide-react"
import type { User } from "@/lib/auth-context"

// --- TypeScript Interface for API Data ---
interface LeaveRequest {
  id: number
  user: User // The backend provides the full user object
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
}

interface LeaveManagementProps {
  userRole: "principal" | "teacher" | "student"
}

export function LeaveManagement({ userRole }: LeaveManagementProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // --- State for API Data and UI ---
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ startDate: "", endDate: "", reason: "" })

  // --- Data Fetching Logic ---
  const fetchLeaveRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.leaves.list()
      if (response.success && Array.isArray(response.data)) {
        setLeaveRequests(response.data)
      } else {
        throw new Error(response.message || "Failed to fetch leave requests.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  // --- Event Handlers for API Actions ---
  const handleSubmitLeave = async () => {
    setIsSubmitting(true)
    try {
      const response = await api.leaves.create({
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason,
      })
      if (response.success) {
        toast({ title: "Success", description: "Your leave request has been submitted." })
        setFormData({ startDate: "", endDate: "", reason: "" })
        setIsDialogOpen(false)
        await fetchLeaveRequests() // Refresh the list
      } else {
        throw new Error(response.message || "Failed to submit leave request.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveLeave = async (leaveId: number) => {
    const response = await api.leaves.approve(leaveId)
    if (response.success) {
      toast({ title: "Approved", description: "The leave request has been approved." })
      await fetchLeaveRequests()
    } else {
      toast({ variant: "destructive", title: "Error", description: response.message || "Failed to approve request." })
    }
  }

  const handleRejectLeave = async (leaveId: number) => {
    const response = await api.leaves.reject(leaveId)
    if (response.success) {
      toast({ title: "Rejected", description: "The leave request has been rejected." })
      await fetchLeaveRequests()
    } else {
      toast({ variant: "destructive", title: "Error", description: response.message || "Failed to reject request." })
    }
  }

  // --- UI Helper Functions ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // --- Derived State for Stats and Filtering ---
  const filteredRequests =
    userRole === "principal"
      ? leaveRequests
      : leaveRequests.filter((req) => req.user.id === user?.id)

  const pendingRequests = filteredRequests.filter((req) => req.status === "pending")
  const approvedRequests = filteredRequests.filter((req) => req.status === "approved")
  const rejectedRequests = filteredRequests.filter((req) => req.status === "rejected")

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            {userRole === "principal" ? "Manage all leave requests across the school" : "View and manage your leave requests"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <Clock className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-gradient-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gradient-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedRequests.length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedRequests.length}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      
      {/* Action Buttons & Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "principal" ? "Manage all leave requests" : "View and manage your leave requests"}
          </p>
        </div>
        {userRole !== "principal" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Request Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle><DialogDescription>Fill out the form to request time off.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}/></div>
                  <div className="space-y-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}/></div>
                </div>
                <div className="space-y-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" placeholder="Please provide a reason..." value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}/></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                <Button onClick={handleSubmitLeave} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Leave Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10"><AvatarFallback>{request.user.first_name[0]}{request.user.last_name[0]}</AvatarFallback></Avatar>
                  <div>
                    <CardTitle className="text-lg">{request.user.first_name} {request.user.last_name}</CardTitle>
                    <CardDescription>{request.user.role.charAt(0).toUpperCase() + request.user.role.slice(1)}</CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">{request.start_date} to {request.end_date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reason</p>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
                {userRole === "principal" && request.status === "pending" && (
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApproveLeave(request.id)}>
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRejectLeave(request.id)}>
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Leave Requests Found</h3>
          </CardContent>
        </Card>
      )}
    </div>
  )
}