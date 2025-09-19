"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, CheckCircle, AlertCircle, User, Shield } from "lucide-react"
import TeacherDetailsModal from "../teacher/teacher-details-modal"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
}

interface PrincipalTeachersTabProps {
  users: User[]
  teacherSearchTerm: string
  setTeacherSearchTerm: (term: string) => void
  showAddTeacherForm: boolean
  setShowAddTeacherForm: (show: boolean) => void
  newTeacher: {
    first_name: string
    last_name: string
    email: string
    username: string
  }
  setNewTeacher: (teacher: any) => void
  handleSaveNewTeacher: () => void
  handleCancelAddTeacher: () => void
  handleViewUserDetails: (userId: number) => void
  handleEditUserDetails: (userId: number) => void
  handleSendMessage: (userId: number, userType: string) => void
}

export default function PrincipalTeachersTab({
  users,
  teacherSearchTerm,
  setTeacherSearchTerm,
  showAddTeacherForm,
  setShowAddTeacherForm,
  newTeacher,
  setNewTeacher,
  handleSaveNewTeacher,
  handleCancelAddTeacher,
  handleViewUserDetails,
  handleEditUserDetails,
  handleSendMessage
}: PrincipalTeachersTabProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [showTeacherDetailsModal, setShowTeacherDetailsModal] = useState(false)

  const handleOpenTeacherDetails = (teacherId: number) => {
    setSelectedTeacherId(teacherId)
    setShowTeacherDetailsModal(true)
  }

  const handleCloseTeacherDetails = () => {
    setShowTeacherDetailsModal(false)
    setSelectedTeacherId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">All Teachers</h2>
          <p className="text-muted-foreground">Manage teaching staff and their assignments</p>
        </div>
        <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" onClick={() => setShowAddTeacherForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Teacher
        </Button>
      </div>

      {/* Add Teacher Form */}
      {showAddTeacherForm && (
        <Card className="mb-6 border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-800">Add New Teacher</CardTitle>
            <CardDescription className="text-green-600">Enter the teacher's information below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  placeholder="Enter first name"
                  value={newTeacher.first_name}
                  onChange={(e) => setNewTeacher({...newTeacher, first_name: e.target.value})}
                  className="border-green-200 focus:border-green-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  placeholder="Enter last name"
                  value={newTeacher.last_name}
                  onChange={(e) => setNewTeacher({...newTeacher, last_name: e.target.value})}
                  className="border-green-200 focus:border-green-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                  className="border-green-200 focus:border-green-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username *</label>
                <Input
                  placeholder="Enter username"
                  value={newTeacher.username}
                  onChange={(e) => setNewTeacher({...newTeacher, username: e.target.value})}
                  className="border-green-200 focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveNewTeacher}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Teacher
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelAddTeacher}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search teachers by name, email, or subject..."
            value={teacherSearchTerm}
            onChange={(e) => setTeacherSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teaching Staff</CardTitle>
          <CardDescription>Complete list of all teachers in the school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length > 0 ? (
              users
                .filter((user) => user.role === 'teacher')
                .filter((user) => {
                  const searchLower = teacherSearchTerm.toLowerCase()
                  return (
                    user.first_name?.toLowerCase().includes(searchLower) ||
                    user.last_name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower)
                  )
                })
                .map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? "secondary" : "outline"} className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTeacherDetails(user.id)}
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Teacher Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewUserDetails(user.id)}>View Profile</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditUserDetails(user.id)}>Edit Details</Button>
                      <Button variant="outline" size="sm" onClick={() => handleSendMessage(user.id, 'teacher')} className="text-blue-600 hover:text-blue-700">
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No teachers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Teacher Details Modal */}
      <TeacherDetailsModal
        teacherId={selectedTeacherId}
        isOpen={showTeacherDetailsModal}
        onClose={handleCloseTeacherDetails}
        onUpdate={() => {
          // Refresh data if needed
          console.log('Teacher details updated')
        }}
      />
    </div>
  )
}