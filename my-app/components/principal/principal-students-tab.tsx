"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, CheckCircle, AlertCircle, DollarSign, Eye } from "lucide-react"
import { FeeDetailsModal } from "../student/fee-details-modal"

interface StudentFromAPI {
  user: {
    id: number
    first_name: string
    last_name: string
  }
  school_class: string
}

interface SchoolClass {
  id: number
  name: string
  students: any[]
}

interface PrincipalStudentsTabProps {
  students: StudentFromAPI[]
  classes: SchoolClass[]
  userSearchTerm: string
  setUserSearchTerm: (term: string) => void
  showAddStudentForm: boolean
  setShowAddStudentForm: (show: boolean) => void
  newStudent: {
    first_name: string
    last_name: string
    email: string
    username: string
    school_class: string
  }
  setNewStudent: (student: any) => void
  handleSaveNewStudent: () => void
  handleCancelAddStudent: () => void
  handleViewStudentInfo: (studentId: number) => void
  handleEditStudent: (studentId: number) => void
  handleSendMessage: (userId: number, userType: string) => void
}

export default function PrincipalStudentsTab({
  students,
  classes,
  userSearchTerm,
  setUserSearchTerm,
  showAddStudentForm,
  setShowAddStudentForm,
  newStudent,
  setNewStudent,
  handleSaveNewStudent,
  handleCancelAddStudent,
  handleViewStudentInfo,
  handleEditStudent,
  handleSendMessage
}: PrincipalStudentsTabProps) {
  const [showFeeDetailsModal, setShowFeeDetailsModal] = React.useState(false)
  const [selectedStudentForFees, setSelectedStudentForFees] = React.useState<{
    id: number
    name: string
  } | null>(null)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">All Students</h2>
          <p className="text-muted-foreground">Complete overview of all students in the school</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" onClick={() => setShowAddStudentForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Student
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students by name, email, or class..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add Student Form */}
      {showAddStudentForm && (
        <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-800">Add New Student</CardTitle>
            <CardDescription className="text-blue-600">Enter the student's information below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  placeholder="Enter first name"
                  value={newStudent.first_name}
                  onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  placeholder="Enter last name"
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username *</label>
                <Input
                  placeholder="Enter username"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent({...newStudent, username: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Class *</label>
                <select
                  className="w-full p-2 border border-blue-200 rounded-lg focus:border-blue-400"
                  value={newStudent.school_class}
                  onChange={(e) => setNewStudent({...newStudent, school_class: e.target.value})}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveNewStudent}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Student
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelAddStudent}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>All enrolled students in the school system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.length > 0 ? (
              students
                .filter((student) => {
                  const searchLower = userSearchTerm.toLowerCase()
                  return (
                    student.user.first_name?.toLowerCase().includes(searchLower) ||
                    student.user.last_name?.toLowerCase().includes(searchLower) ||
                    student.school_class?.toLowerCase().includes(searchLower) ||
                    `${student.user.first_name} ${student.user.last_name}`.toLowerCase().includes(searchLower)
                  )
                })
                .map((student) => (
                  <div key={student.user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.user.first_name} {student.user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{student.school_class}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Student
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleViewStudentInfo(student.user.id)}>View Details</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditStudent(student.user.id)}>Edit</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudentForFees({
                            id: student.user.id,
                            name: `${student.user.first_name} ${student.user.last_name}`
                          })
                          setShowFeeDetailsModal(true)
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Fee Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSendMessage(student.user.id, 'student')} className="text-blue-600 hover:text-blue-700">
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fee Details Modal */}
      <FeeDetailsModal
        isOpen={showFeeDetailsModal}
        onClose={() => setShowFeeDetailsModal(false)}
        studentId={selectedStudentForFees?.id}
        studentName={selectedStudentForFees?.name}
      />
    </div>
  )
}