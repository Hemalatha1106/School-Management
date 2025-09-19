"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Mail, Phone, MapPin, Filter, Users, BookOpen } from "lucide-react"

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

interface TeacherStudentsTabProps {
  students: StudentFromAPI[]
  classes: SchoolClass[]
  handleViewStudentDetails: (studentId: number) => void
  handleSendMessage: (userId: number, userType: string) => void
}

export default function TeacherStudentsTab({
  students,
  classes,
  handleViewStudentDetails,
  handleSendMessage
}: TeacherStudentsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")

  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === "" ||
      student.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.user.first_name} ${student.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesClass = classFilter === "all" || student.school_class === classFilter

    return matchesSearch && matchesClass
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`)
      case "class":
        return a.school_class.localeCompare(b.school_class)
      default:
        return 0
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Students</h2>
          <p className="text-muted-foreground">Manage students in your classes</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {filteredStudents.length} Students
          </Badge>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.name.replace('Class ', '').split('-')[0]}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setClassFilter("all")
                  setSortBy("name")
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Directory
          </CardTitle>
          <CardDescription>
            All students in your classes ({filteredStudents.length} students)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <div key={student.user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-sm">
                        {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-lg">
                        {student.user.first_name} {student.user.last_name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          Class {student.school_class}
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Student
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudentDetails(student.user.id)}
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(student.user.id, 'student')}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Students Found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || classFilter !== "all"
                    ? "No students match your current filters."
                    : "You don't have any students assigned to your classes yet."}
                </p>
                {(searchTerm || classFilter !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("")
                      setClassFilter("all")
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Class-wise Summary */}
      {filteredStudents.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Class-wise Distribution</CardTitle>
            <CardDescription>Number of students in each class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const classGrade = cls.name.replace('Class ', '').split('-')[0]
                const classStudents = students.filter(s => s.school_class === classGrade)

                return (
                  <div key={cls.id} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-800">{cls.name}</h4>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {classStudents.length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {classStudents.slice(0, 3).map((student) => (
                        <div key={student.user.id} className="text-xs text-blue-600 flex items-center gap-1">
                          <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                          {student.user.first_name} {student.user.last_name}
                        </div>
                      ))}
                      {classStudents.length > 3 && (
                        <div className="text-xs text-blue-500 font-medium">
                          +{classStudents.length - 3} more students
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg per Class</p>
                <p className="text-2xl font-bold">
                  {classes.length > 0 ? Math.round(filteredStudents.length / classes.length) : 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}