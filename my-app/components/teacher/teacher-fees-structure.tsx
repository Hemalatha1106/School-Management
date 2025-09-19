"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Edit,
  Save,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  Shield,
  Download,
  Upload,
  Eye,
  EyeOff
} from "lucide-react"

// Comprehensive Teacher Fees Structure Interface
interface TeacherFeeStructure {
  id: number
  name: string
  category: "Travel" | "Professional Development" | "Equipment" | "Conference" | "Other"
  fee_type: "fixed" | "percentage" | "tiered"
  amount: string
  max_amount?: string
  description: string
  requires_approval: boolean
  approval_levels: number
  approval_workflow: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  audit_trail: { timestamp: string, action: string, user_id: number }[]
}

interface TeacherReimbursementClaim {
  id: number
  teacher_id: number
  teacher_name: string
  fee_structure_id: number
  category: string
  amount: number
  description: string
  receipts: string[]
  status: "pending" | "approved" | "rejected" | "paid"
  submitted_at: string
  approved_at?: string
  paid_at?: string
  approval_chain: { level: number, approver_id: number, status: string, timestamp: string }[]
  audit_logs: { timestamp: string, action: string, user_id: number, details: string }[]
}

export function TeacherFeesStructure() {
  const { toast } = useToast()
  const [feeStructures, setFeeStructures] = useState<TeacherFeeStructure[]>([])
  const [reimbursementClaims, setReimbursementClaims] = useState<TeacherReimbursementClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("structure")
  const [showAddFeeForm, setShowAddFeeForm] = useState(false)
  const [editingFee, setEditingFee] = useState<TeacherFeeStructure | null>(null)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<TeacherReimbursementClaim | null>(null)

  // Form states
  const [newFeeStructure, setNewFeeStructure] = useState<{
    name: string
    category: "Travel" | "Professional Development" | "Equipment" | "Conference" | "Other"
    fee_type: "fixed" | "percentage" | "tiered"
    amount: string
    max_amount: string
    description: string
    requires_approval: boolean
    approval_levels: number
    approval_workflow: string[]
  }>({
    name: "",
    category: "Professional Development",
    fee_type: "fixed",
    amount: "",
    max_amount: "",
    description: "",
    requires_approval: true,
    approval_levels: 2,
    approval_workflow: ["department_head", "finance_officer"]
  })

  const [newClaim, setNewClaim] = useState({
    fee_structure_id: "",
    amount: "",
    description: "",
    receipts: [] as File[]
  })

  useEffect(() => {
    fetchFeeStructures()
    fetchReimbursementClaims()
  }, [])

  const fetchFeeStructures = async () => {
    try {
      // Import sample data from centralized demo data file
      const { sampleTeacherFeeStructures } = await import("@/components/shared/fee-demo-data")
      setFeeStructures(sampleTeacherFeeStructures)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load fee structures"
      })
    }
  }

  const fetchReimbursementClaims = async () => {
    try {
      // Import sample reimbursement claims data from centralized demo data file
      const { sampleTeacherReimbursementClaims } = await import("@/components/shared/fee-demo-data")
      setReimbursementClaims(sampleTeacherReimbursementClaims)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reimbursement claims"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveFeeStructure = async () => {
    try {
      if (editingFee) {
        // Update existing
        const updatedFee = { ...editingFee, ...newFeeStructure }
        setFeeStructures(prev => prev.map(f => f.id === editingFee.id ? updatedFee : f))
        toast({
          title: "Success",
          description: "Fee structure updated successfully"
        })
      } else {
        // Create new
        const newFee: TeacherFeeStructure = {
          ...newFeeStructure,
          id: Date.now(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          audit_trail: [{
            timestamp: new Date().toISOString(),
            action: "created",
            user_id: 1 // Current user ID
          }]
        }
        setFeeStructures(prev => [...prev, newFee])
        toast({
          title: "Success",
          description: "Fee structure created successfully"
        })
      }

      setShowAddFeeForm(false)
      setEditingFee(null)
      resetFeeForm()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save fee structure"
      })
    }
  }

  const resetFeeForm = () => {
    setNewFeeStructure({
      name: "",
      category: "Professional Development" as const,
      fee_type: "fixed" as const,
      amount: "",
      max_amount: "",
      description: "",
      requires_approval: true,
      approval_levels: 2,
      approval_workflow: ["department_head", "finance_officer"]
    })
  }

  const handleEditFee = (fee: TeacherFeeStructure) => {
    setEditingFee(fee)
    setNewFeeStructure({
      name: fee.name,
      category: fee.category,
      fee_type: fee.fee_type,
      amount: fee.amount,
      max_amount: fee.max_amount || "",
      description: fee.description,
      requires_approval: fee.requires_approval,
      approval_levels: fee.approval_levels,
      approval_workflow: [...fee.approval_workflow]
    })
    setShowAddFeeForm(true)
  }

  const handleSubmitClaim = async () => {
    try {
      const claim: TeacherReimbursementClaim = {
        id: Date.now(),
        teacher_id: 1, // Current teacher ID
        teacher_name: "Current Teacher", // Current teacher name
        fee_structure_id: parseInt(newClaim.fee_structure_id),
        category: feeStructures.find(f => f.id === parseInt(newClaim.fee_structure_id))?.category || "Other",
        amount: parseFloat(newClaim.amount),
        description: newClaim.description,
        receipts: newClaim.receipts.map(f => f.name),
        status: "pending",
        submitted_at: new Date().toISOString(),
        approval_chain: [],
        audit_logs: [{
          timestamp: new Date().toISOString(),
          action: "submitted",
          user_id: 1,
          details: "Reimbursement claim submitted"
        }]
      }

      setReimbursementClaims(prev => [...prev, claim])
      toast({
        title: "Success",
        description: "Reimbursement claim submitted successfully"
      })

      setShowClaimForm(false)
      setNewClaim({
        fee_structure_id: "",
        amount: "",
        description: "",
        receipts: []
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit reimbursement claim"
      })
    }
  }

  const handleApproveClaim = (claimId: number) => {
    setReimbursementClaims(prev =>
      prev.map(claim =>
        claim.id === claimId
          ? { ...claim, status: "approved" as const, approved_at: new Date().toISOString() }
          : claim
      )
    )
    toast({
      title: "Success",
      description: "Reimbursement claim approved"
    })
  }

  const handleRejectClaim = (claimId: number) => {
    setReimbursementClaims(prev =>
      prev.map(claim =>
        claim.id === claimId
          ? { ...claim, status: "rejected" as const }
          : claim
      )
    )
    toast({
      title: "Claim Rejected",
      description: "Reimbursement claim has been rejected"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case "paid":
        return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Clock className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teacher Fees & Reimbursements</h2>
          <p className="text-muted-foreground">Manage teacher reimbursement policies and claims</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab("claims")}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            View Claims
          </Button>
          <Button
            onClick={() => setShowAddFeeForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Fee Structure
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structure">Fee Structures</TabsTrigger>
          <TabsTrigger value="claims">Reimbursement Claims</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-4">
          {/* Fee Structures Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feeStructures.map((fee) => (
              <Card key={fee.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{fee.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{fee.category}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditFee(fee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant="secondary">{fee.fee_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {fee.fee_type === "percentage" ? `${fee.amount}%` : `₹${fee.amount}`}
                        {fee.max_amount && ` (Max: ₹${fee.max_amount})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Approval:</span>
                      <span className="text-sm">{fee.approval_levels} level{fee.approval_levels > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{fee.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add/Edit Fee Structure Dialog */}
          <Dialog open={showAddFeeForm} onOpenChange={setShowAddFeeForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFee ? "Edit Fee Structure" : "Add New Fee Structure"}
                </DialogTitle>
                <DialogDescription>
                  Configure reimbursement policies for teachers
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newFeeStructure.name}
                    onChange={(e) => setNewFeeStructure({...newFeeStructure, name: e.target.value})}
                    placeholder="e.g., Conference Attendance"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newFeeStructure.category}
                    onValueChange={(value: any) => setNewFeeStructure({...newFeeStructure, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Professional Development">Professional Development</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Conference">Conference</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select
                    value={newFeeStructure.fee_type}
                    onValueChange={(value: any) => setNewFeeStructure({...newFeeStructure, fee_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="tiered">Tiered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.amount}
                    onChange={(e) => setNewFeeStructure({...newFeeStructure, amount: e.target.value})}
                    placeholder={newFeeStructure.fee_type === "percentage" ? "e.g., 80" : "e.g., 5000"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Amount (Optional)</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.max_amount}
                    onChange={(e) => setNewFeeStructure({...newFeeStructure, max_amount: e.target.value})}
                    placeholder="Maximum reimbursement amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Approval Levels</Label>
                  <Select
                    value={newFeeStructure.approval_levels.toString()}
                    onValueChange={(value) => setNewFeeStructure({...newFeeStructure, approval_levels: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Level</SelectItem>
                      <SelectItem value="2">2 Levels</SelectItem>
                      <SelectItem value="3">3 Levels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newFeeStructure.description}
                  onChange={(e) => setNewFeeStructure({...newFeeStructure, description: e.target.value})}
                  placeholder="Describe the reimbursement policy..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_approval"
                  checked={newFeeStructure.requires_approval}
                  onCheckedChange={(checked) =>
                    setNewFeeStructure({...newFeeStructure, requires_approval: checked as boolean})
                  }
                />
                <Label htmlFor="requires_approval">Requires approval workflow</Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddFeeForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFeeStructure}>
                  {editingFee ? "Update" : "Create"} Fee Structure
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Reimbursement Claims</h3>
              <p className="text-sm text-muted-foreground">Manage teacher reimbursement requests</p>
            </div>
            <Button onClick={() => setShowClaimForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Submit Claim
            </Button>
          </div>

          {/* Claims List */}
          <div className="space-y-4">
            {reimbursementClaims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{claim.teacher_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{claim.category} - {claim.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(claim.status)}
                      <span className="text-sm font-medium">₹{claim.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      {claim.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveClaim(claim.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectClaim(claim.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Submit Claim Dialog */}
          <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Reimbursement Claim</DialogTitle>
                <DialogDescription>
                  Request reimbursement for approved expenses
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Fee Structure</Label>
                  <Select
                    value={newClaim.fee_structure_id}
                    onValueChange={(value) => setNewClaim({...newClaim, fee_structure_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reimbursement type" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeStructures.map((fee) => (
                        <SelectItem key={fee.id} value={fee.id.toString()}>
                          {fee.name} ({fee.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newClaim.amount}
                    onChange={(e) => setNewClaim({...newClaim, amount: e.target.value})}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newClaim.description}
                    onChange={(e) => setNewClaim({...newClaim, description: e.target.value})}
                    placeholder="Describe the expense..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receipts</Label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setNewClaim({...newClaim, receipts: files})
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload receipts (PDF, JPG, PNG) - Max 5MB each
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowClaimForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitClaim}>
                  Submit Claim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reimbursementClaims.length}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reimbursementClaims.filter(c => c.status === "pending").length}
                </div>
                <p className="text-sm text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{reimbursementClaims.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Approved claims</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All reimbursement activities are logged and audited for compliance purposes.
              Reports can be exported for accounting integration.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}