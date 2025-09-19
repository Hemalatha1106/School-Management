"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BookOpen,
  Clock,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  Edit,
  Plus,
  AlertCircle,
  Settings,
  Send
} from "lucide-react"

interface SchoolClass {
  id: number
  name: string
  students: any[]
}

interface PrincipalTimetablesTabProps {
  classes: SchoolClass[]
  handleOpenClassDetailsModal: (classId: number) => void
}

export function PrincipalTimetablesTab({
  classes,
  handleOpenClassDetailsModal
}: PrincipalTimetablesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">School Timetable Management</h2>
          <p className="text-muted-foreground">Comprehensive view of all class schedules and academic planning</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Timetable
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Classes</p>
                <p className="text-2xl font-bold text-cyan-600">{classes.length || 8}</p>
              </div>
              <BookOpen className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Periods</p>
                <p className="text-2xl font-bold text-teal-600">175</p>
              </div>
              <Clock className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teaching Hours</p>
                <p className="text-2xl font-bold text-blue-600">35h</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">School Days</p>
                <p className="text-2xl font-bold text-indigo-600">5</p>
              </div>
              <CheckCircle className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Timetables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {classes.length > 0 ? (
          classes.map((classItem, index) => (
            <Card key={classItem.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-cyan-50 via-teal-50 to-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-cyan-800">
                      <Calendar className="h-5 w-5" />
                      {classItem.name}
                    </CardTitle>
                    <CardDescription className="text-cyan-600">
                      Class Teacher: {index % 3 === 0 ? 'Mrs. Johnson' : index % 3 === 1 ? 'Mr. Smith' : 'Ms. Davis'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                    {classItem.students?.length || Math.floor(Math.random() * 30) + 20} Students
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Weekly Schedule */}
                <div className="space-y-3">
                  {[
                    { day: 'Monday', color: 'bg-red-50 border-red-200', subjects: ['Mathematics', 'English', 'Science', 'History'] },
                    { day: 'Tuesday', color: 'bg-orange-50 border-orange-200', subjects: ['Physics', 'Chemistry', 'Geography', 'Art'] },
                    { day: 'Wednesday', color: 'bg-yellow-50 border-yellow-200', subjects: ['Biology', 'Computer Science', 'Hindi', 'Physical Education'] },
                    { day: 'Thursday', color: 'bg-green-50 border-green-200', subjects: ['Mathematics', 'English', 'Social Studies', 'Music'] },
                    { day: 'Friday', color: 'bg-blue-50 border-blue-200', subjects: ['Science', 'Mathematics', 'Art', 'Games'] }
                  ].map((schedule, dayIndex) => (
                    <div key={schedule.day} className={`border rounded-lg p-3 ${schedule.color}`}>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        {schedule.day}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {schedule.subjects.map((subject, subjIndex) => (
                          <div key={subjIndex} className="flex justify-between items-center p-2 bg-white/60 rounded">
                            <span className="font-medium">{subject}</span>
                            <span className="text-muted-foreground">
                              {['9:00', '10:00', '11:00', '12:00'][subjIndex]} AM
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-cyan-50"
                    onClick={() => handleOpenClassDetailsModal(classItem.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-teal-50"
                    onClick={() => {
                      // Handle edit schedule
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Schedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50"
                    onClick={() => {
                      // Handle download schedule
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Enhanced fallback sample timetables
          [
            {
              name: 'Class 10-A',
              teacher: 'Mrs. Johnson',
              students: 28,
              color: 'from-cyan-50 to-teal-50'
            },
            {
              name: 'Class 9-B',
              teacher: 'Mr. Smith',
              students: 32,
              color: 'from-teal-50 to-blue-50'
            },
            {
              name: 'Class 8-A',
              teacher: 'Ms. Davis',
              students: 25,
              color: 'from-blue-50 to-indigo-50'
            }
          ].map((sampleClass, index) => (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
              <CardHeader className={`bg-gradient-to-r ${sampleClass.color} border-b`}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-cyan-800">
                      <Calendar className="h-5 w-5" />
                      {sampleClass.name}
                    </CardTitle>
                    <CardDescription className="text-cyan-600">
                      Class Teacher: {sampleClass.teacher}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                    {sampleClass.students} Students
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[
                    { day: 'Monday', subjects: ['Mathematics', 'English', 'Science', 'History'] },
                    { day: 'Tuesday', subjects: ['Physics', 'Chemistry', 'Geography', 'Art'] },
                    { day: 'Wednesday', subjects: ['Biology', 'Computer Science', 'Hindi', 'PE'] },
                    { day: 'Thursday', subjects: ['Mathematics', 'English', 'Social Studies', 'Music'] },
                    { day: 'Friday', subjects: ['Science', 'Mathematics', 'Art', 'Games'] }
                  ].map((schedule, dayIndex) => (
                    <div key={schedule.day} className="border rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        {schedule.day}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {schedule.subjects.map((subject, subjIndex) => (
                          <div key={subjIndex} className="flex justify-between items-center p-2 bg-white rounded border">
                            <span className="font-medium">{subject}</span>
                            <span className="text-muted-foreground">
                              {['9:00', '10:00', '11:00', '12:00'][subjIndex]} AM
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-cyan-50"
                    onClick={() => handleOpenClassDetailsModal(index + 1)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-teal-50"
                    onClick={() => {
                      // Handle edit schedule
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Schedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50"
                    onClick={() => {
                      // Handle download schedule
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Advanced Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Conflicts & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Schedule Conflicts & Alerts
            </CardTitle>
            <CardDescription>Monitor timetable conflicts and important notices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Room 201 Double-booked</p>
                  <p className="text-xs text-muted-foreground">Mathematics and Physics classes overlap</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Holiday Notice</p>
                  <p className="text-xs text-muted-foreground">School closed on Friday for teacher training</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">All schedules updated</p>
                  <p className="text-xs text-muted-foreground">Timetables synchronized across all classes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common timetable management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex flex-col items-center gap-2 hover:bg-cyan-50">
                <Plus className="h-6 w-6 text-cyan-600" />
                <span className="text-sm">Add Period</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center gap-2 hover:bg-teal-50">
                <Edit className="h-6 w-6 text-teal-600" />
                <span className="text-sm">Bulk Edit</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center gap-2 hover:bg-blue-50">
                <Download className="h-6 w-6 text-blue-600" />
                <span className="text-sm">Export PDF</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center gap-2 hover:bg-indigo-50">
                <Send className="h-6 w-6 text-indigo-600" />
                <span className="text-sm">Notify Staff</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
          <CardDescription>Complete school schedule summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Time</th>
                  <th className="text-center p-3 font-semibold">Monday</th>
                  <th className="text-center p-3 font-semibold">Tuesday</th>
                  <th className="text-center p-3 font-semibold">Wednesday</th>
                  <th className="text-center p-3 font-semibold">Thursday</th>
                  <th className="text-center p-3 font-semibold">Friday</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '9:00 - 10:00 AM', subjects: ['Mathematics', 'Physics', 'Biology', 'Mathematics', 'Science'] },
                  { time: '10:00 - 11:00 AM', subjects: ['English', 'Chemistry', 'Computer Science', 'English', 'Mathematics'] },
                  { time: '11:00 - 12:00 PM', subjects: ['Science', 'Geography', 'Hindi', 'Social Studies', 'Art'] },
                  { time: '12:00 - 1:00 PM', subjects: ['History', 'Art', 'Physical Education', 'Music', 'Games'] }
                ].map((period, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-sm">{period.time}</td>
                    {period.subjects.map((subject, subjIndex) => (
                      <td key={subjIndex} className="p-3 text-center">
                        <div className="bg-gradient-to-r from-cyan-100 to-teal-100 rounded px-2 py-1 text-xs font-medium">
                          {subject}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}