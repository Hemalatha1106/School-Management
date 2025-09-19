"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, Eye, Users, BookOpen, Calendar } from "lucide-react"

interface SchoolClass {
  id: number
  name: string
  students: any[]
}

interface StudentFromAPI {
  user: {
    id: number
    first_name: string
    last_name: string
  }
  school_class: string
}

interface TeacherClassesTabProps {
  classes: SchoolClass[]
  students: StudentFromAPI[]
  handleViewClassDetails: (classId: number) => void
  setActiveTab: (tab: string) => void
}

export default function TeacherClassesTab({
  classes,
  students,
  handleViewClassDetails,
  setActiveTab
}: TeacherClassesTabProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Classes</h2>
          <p className="text-muted-foreground">Manage the classes you teach</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Class
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((classItem) => {
            // Calculate student count for this class
            const classGrade = classItem.name.replace('Class ', '').split('-')[0]
            const studentCount = students.filter(s => s.school_class === classGrade).length

            return (
              <Card key={classItem.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                        <BookOpen className="h-5 w-5" />
                        {classItem.name}
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Grade {classGrade}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {studentCount} Students
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Class Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-blue-800">{studentCount}</p>
                        <p className="text-xs text-blue-600">Students</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-green-800">5</p>
                        <p className="text-xs text-green-600">Subjects</p>
                      </div>
                    </div>

                    {/* Recent Students */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recent Students</h4>
                      <div className="space-y-2">
                        {students
                          .filter(s => s.school_class === classGrade)
                          .slice(0, 3)
                          .map((student) => (
                            <div key={student.user.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">
                                {student.user.first_name} {student.user.last_name}
                              </span>
                            </div>
                          ))}
                        {studentCount > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{studentCount - 3} more students
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-blue-50"
                        onClick={() => handleViewClassDetails(classItem.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-purple-50"
                        onClick={() => setActiveTab("students")}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Manage Students
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Classes Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No classes match your search criteria." : "You haven't been assigned any classes yet."}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredClasses.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Class Summary</CardTitle>
            <CardDescription>Overview of your teaching load</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredClasses.length}</div>
                <div className="text-sm text-blue-600">Total Classes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {filteredClasses.reduce((total, cls) => {
                    const classGrade = cls.name.replace('Class ', '').split('-')[0]
                    return total + students.filter(s => s.school_class === classGrade).length
                  }, 0)}
                </div>
                <div className="text-sm text-green-600">Total Students</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(filteredClasses.reduce((total, cls) => {
                    const classGrade = cls.name.replace('Class ', '').split('-')[0]
                    return total + students.filter(s => s.school_class === classGrade).length
                  }, 0) / filteredClasses.length)}
                </div>
                <div className="text-sm text-purple-600">Avg Students/Class</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}