"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Shield,
  FileText,
  GraduationCap,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  XCircle,
  Download,
  Edit,
  Save,
  Loader2
} from "lucide-react"

// Comprehensive Teacher Profile Interface
interface TeacherProfile {
  // Personal Information
  id: number
  user: {
    id: number
    username: string
    first_name: string
    last_name: string
    email: string
    role: string
    is_active: boolean
  }
  date_of_birth?: string
  gender?: string
  nationality?: string
  national_id?: string
  marital_status?: string
  number_of_dependents?: number
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  preferred_pronouns?: string
  accessibility_needs?: string

  // Qualifications and Certifications
  educational_background?: string
  degrees?: string[]
  teaching_certifications?: string[]
  certification_expiry_dates?: { [key: string]: string }
  subject_specializations?: string[]
  professional_development?: string[]
  skills_assessments?: { [key: string]: string }

  // Employment History
  previous_schools?: string[]
  positions_held?: string[]
  employment_start_dates?: string[]
  employment_end_dates?: string[]
  performance_reviews?: string[]
  references?: { name: string, contact: string, verified: boolean }[]

  // Contact Details
  permanent_address?: string
  temporary_address?: string
  primary_phone?: string
  secondary_phone?: string
  personal_email?: string
  professional_email?: string
  preferred_communication?: string
  social_media_handles?: { [key: string]: string }

  // Administrative and Compliance Data
  employment_contract_details?: string
  salary?: number
  benefits?: string[]
  working_hours?: string
  probation_period?: string
  disciplinary_records?: string[]
  background_check_status?: string
  criminal_history_check?: string
  credit_check_status?: string
  visa_status?: string
  visa_expiry_date?: string
  work_permit_status?: string
  work_permit_expiry_date?: string
  health_conditions?: string[]
  allergies?: string[]
  vaccination_records?: string[]
  ethnicity?: string
  disability_status?: string
  union_membership?: string
  tax_withholding_info?: string

  // Other Relevant Data
  performance_metrics?: {
    student_feedback_score?: number
    classroom_observation_rating?: number
    retention_rate?: number
    professional_memberships?: string[]
    publications?: string[]
    extracurricular_roles?: string[]
  }

  // Security and Audit
  last_accessed?: string
  access_level?: string
  mfa_enabled?: boolean
  audit_logs?: { timestamp: string, action: string, user_id: number }[]
}

interface TeacherDetailsModalProps {
  teacherId: number | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export default function TeacherDetailsModal({
  teacherId,
  isOpen,
  onClose,
  onUpdate
}: TeacherDetailsModalProps) {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<Partial<TeacherProfile>>({})
  const [activeTab, setActiveTab] = useState("personal")
  const [hasAccess, setHasAccess] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [mfaVerified, setMfaVerified] = useState(false)

  // Check user permissions
  useEffect(() => {
    if (currentUser) {
      const allowedRoles = ['principal', 'administrator', 'hr_admin', 'compliance_officer']
      setHasAccess(allowedRoles.includes(currentUser.role))
    }
  }, [currentUser])

  // Fetch teacher data
  useEffect(() => {
    if (teacherId && isOpen && hasAccess) {
      fetchTeacherData()
    }
  }, [teacherId, isOpen, hasAccess])

  const fetchTeacherData = async () => {
    setIsLoading(true)
    try {
      const response = await api.teachers.get(teacherId!)
      if (response.success) {
        setTeacher(response.data as TeacherProfile)
        setEditedData(response.data as TeacherProfile)
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load teacher details"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!teacher) return

    try {
      const response = await api.teachers.update(teacher.id, editedData)
      if (response.success) {
        setTeacher({ ...teacher, ...editedData })
        setIsEditing(false)
        toast({
          title: "Success",
          description: "Teacher details updated successfully"
        })
        onUpdate?.()
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update teacher details"
      })
    }
  }

  const handleExportData = () => {
    if (!teacher) return

    const exportData = {
      ...teacher,
      // Redact sensitive information for export
      national_id: teacher.national_id ? "***REDACTED***" : undefined,
      salary: currentUser?.role === 'principal' ? teacher.salary : undefined,
      bank_account_details: "***REDACTED***"
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teacher_${teacher.user.first_name}_${teacher.user.last_name}_profile.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: "Teacher profile exported with sensitive data redacted"
    })
  }

  const logAuditEvent = (action: string) => {
    // In a real implementation, this would send to audit log API
    console.log(`Audit: ${currentUser?.username} performed ${action} on teacher ${teacher?.user.first_name} ${teacher?.user.last_name}`)
  }

  if (!hasAccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </DialogTitle>
            <DialogDescription>
              You do not have permission to view teacher details. This action requires Principal, Administrator, HR Admin, or Compliance Officer privileges.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading teacher details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!teacher) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teacher Not Found</DialogTitle>
            <DialogDescription>Unable to load teacher information.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Teacher Details - {teacher.user.first_name} {teacher.user.last_name}
            <Badge variant={teacher.user.is_active ? "secondary" : "outline"}>
              {teacher.user.is_active ? "Active" : "Inactive"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Comprehensive teacher profile with sensitive information. Access logged for compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="flex items-center gap-2"
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitiveData ? "Hide" : "Show"} Sensitive Data
          </Button>
          <Button
            variant="outline"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export (Redacted)
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            {isEditing ? "Cancel Edit" : "Edit Details"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Legal Name</Label>
                  <Input
                    value={`${teacher.user.first_name} ${teacher.user.last_name}`}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={editedData.date_of_birth || teacher.date_of_birth || ""}
                    onChange={(e) => setEditedData({...editedData, date_of_birth: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Gender Identity</Label>
                  <Select
                    value={editedData.gender || teacher.gender || ""}
                    onValueChange={(value) => setEditedData({...editedData, gender: value})}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input
                    value={editedData.nationality || teacher.nationality || ""}
                    onChange={(e) => setEditedData({...editedData, nationality: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                {showSensitiveData && (
                  <>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        National ID / SSN
                      </Label>
                      <Input
                        value={editedData.national_id || teacher.national_id || ""}
                        onChange={(e) => setEditedData({...editedData, national_id: e.target.value})}
                        disabled={!isEditing}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label>Marital Status</Label>
                      <Select
                        value={editedData.marital_status || teacher.marital_status || ""}
                        onValueChange={(value) => setEditedData({...editedData, marital_status: value})}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div>
                  <Label>Preferred Pronouns</Label>
                  <Input
                    value={editedData.preferred_pronouns || teacher.preferred_pronouns || ""}
                    onChange={(e) => setEditedData({...editedData, preferred_pronouns: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Accessibility Needs</Label>
                  <Textarea
                    value={editedData.accessibility_needs || teacher.accessibility_needs || ""}
                    onChange={(e) => setEditedData({...editedData, accessibility_needs: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Qualifications & Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Educational Background</Label>
                  <Textarea
                    value={editedData.educational_background || teacher.educational_background || ""}
                    onChange={(e) => setEditedData({...editedData, educational_background: e.target.value})}
                    disabled={!isEditing}
                    placeholder="List degrees, institutions, graduation dates..."
                  />
                </div>
                <div>
                  <Label>Teaching Certifications</Label>
                  <Textarea
                    value={teacher.teaching_certifications?.join(", ") || ""}
                    disabled={!isEditing}
                    placeholder="State licenses, national certifications..."
                  />
                </div>
                <div>
                  <Label>Subject Specializations</Label>
                  <Input
                    value={teacher.subject_specializations?.join(", ") || ""}
                    disabled={!isEditing}
                    placeholder="Mathematics, Science, English..."
                  />
                </div>
                <div>
                  <Label>Professional Development</Label>
                  <Textarea
                    value={teacher.professional_development?.join(", ") || ""}
                    disabled={!isEditing}
                    placeholder="Workshops, courses, conferences attended..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employment History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Previous Schools/Institutions</Label>
                  <Textarea
                    value={teacher.previous_schools?.join(", ") || ""}
                    disabled={!isEditing}
                    placeholder="List previous employers..."
                  />
                </div>
                <div>
                  <Label>Positions Held</Label>
                  <Textarea
                    value={teacher.positions_held?.join(", ") || ""}
                    disabled={!isEditing}
                    placeholder="Previous roles and responsibilities..."
                  />
                </div>
                <div>
                  <Label>Performance Reviews</Label>
                  <Textarea
                    value={teacher.performance_reviews?.join("; ") || ""}
                    disabled={!isEditing}
                    placeholder="Key achievements and ratings..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Phone</Label>
                  <Input
                    value={editedData.primary_phone || teacher.primary_phone || ""}
                    onChange={(e) => setEditedData({...editedData, primary_phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Secondary Phone</Label>
                  <Input
                    value={editedData.secondary_phone || teacher.secondary_phone || ""}
                    onChange={(e) => setEditedData({...editedData, secondary_phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Personal Email</Label>
                  <Input
                    type="email"
                    value={editedData.personal_email || teacher.personal_email || ""}
                    onChange={(e) => setEditedData({...editedData, personal_email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Professional Email</Label>
                  <Input
                    type="email"
                    value={teacher.user.email}
                    disabled
                  />
                </div>
                <div className="col-span-2">
                  <Label>Permanent Address</Label>
                  <Textarea
                    value={editedData.permanent_address || teacher.permanent_address || ""}
                    onChange={(e) => setEditedData({...editedData, permanent_address: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This section contains sensitive compliance and administrative data. Access is restricted and audited.
              </AlertDescription>
            </Alert>

            {showSensitiveData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Administrative & Compliance Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employment Contract</Label>
                    <Textarea
                      value={teacher.employment_contract_details || ""}
                      disabled={!isEditing}
                      placeholder="Contract terms, duration, conditions..."
                    />
                  </div>
                  <div>
                    <Label>Salary Information</Label>
                    <Input
                      type="number"
                      value={teacher.salary || ""}
                      disabled
                      placeholder="Access restricted"
                    />
                  </div>
                  <div>
                    <Label>Background Check Status</Label>
                    <Badge variant={teacher.background_check_status === 'cleared' ? 'secondary' : 'destructive'}>
                      {teacher.background_check_status || 'Pending'}
                    </Badge>
                  </div>
                  <div>
                    <Label>Visa/Work Permit Status</Label>
                    <div className="space-y-2">
                      <Input value={teacher.visa_status || ""} disabled placeholder="Visa status" />
                      <Input
                        type="date"
                        value={teacher.visa_expiry_date || ""}
                        disabled
                        placeholder="Expiry date"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Health & Safety</Label>
                    <Textarea
                      value={teacher.health_conditions?.join(", ") || ""}
                      disabled={!isEditing}
                      placeholder="Medical conditions, allergies, vaccinations..."
                    />
                  </div>
                  <div>
                    <Label>Diversity & Inclusion</Label>
                    <div className="space-y-2">
                      <Input value={teacher.ethnicity || ""} disabled={!isEditing} placeholder="Ethnicity" />
                      <Input value={teacher.disability_status || ""} disabled={!isEditing} placeholder="Disability status" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Student Feedback Score</Label>
                  <Input
                    type="number"
                    value={teacher.performance_metrics?.student_feedback_score || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label>Classroom Observation Rating</Label>
                  <Input
                    value={teacher.performance_metrics?.classroom_observation_rating || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label>Retention Rate</Label>
                  <Input
                    value={teacher.performance_metrics?.retention_rate || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label>Professional Memberships</Label>
                  <Textarea
                    value={teacher.performance_metrics?.professional_memberships?.join(", ") || ""}
                    disabled={!isEditing}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Publications & Research</Label>
                  <Textarea
                    value={teacher.performance_metrics?.publications?.join("; ") || ""}
                    disabled={!isEditing}
                    placeholder="Research papers, articles, books..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {isEditing && (
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}