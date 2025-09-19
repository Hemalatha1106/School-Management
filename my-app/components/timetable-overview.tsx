"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Calendar, Clock, Users, BookOpen, Filter } from "lucide-react"

// TypeScript interfaces
interface TimetableEntry {
  id: number
  day_of_week: string
  start_time: string
  end_time: string
  subject: string
  teacher: {
    user: {
      id: number
      first_name: string
      last_name: string
    }
  } | null
  school_class: {
    id: number
    name: string
  }
}

interface SchoolClass {
  id: number
  name: string
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
]

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
]

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-red-100 text-red-800 border-red-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
]

const getSubjectColor = (subject: string, className: string): string => {
  const combined = subject + className
  const hash = combined.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0)
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
}

export function TimetableOverview() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all timetable data
  const fetchTimetableData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [timetableRes, classesRes] = await Promise.all([
        api.timetable.list(),
        api.classes.list()
      ])

      if (timetableRes.success && classesRes.success) {
        setTimetable(timetableRes.data as TimetableEntry[])
        setClasses(classesRes.data as SchoolClass[])
      } else {
        throw new Error("Failed to fetch timetable data")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTimetableData()
  }, [])

  // Filter timetable based on selected class
  const filteredTimetable = useMemo(() => {
    if (selectedClassId === "all") return timetable
    return timetable.filter(entry => entry.school_class.id.toString() === selectedClassId)
  }, [timetable, selectedClassId])

  // Group timetable by day and time
  const timetableGrid = useMemo(() => {
    const grid: { [key: string]: { [key: string]: TimetableEntry[] } } = {}

    WEEK_DAYS.forEach(day => {
      grid[day.value] = {}
      TIME_SLOTS.forEach(time => {
        grid[day.value][time] = []
      })
    })

    filteredTimetable.forEach(entry => {
      const day = entry.day_of_week
      const startHour = entry.start_time.substring(0, 2) + ":00"
      if (grid[day] && grid[day][startHour]) {
        grid[day][startHour].push(entry)
      }
    })

    return grid
  }, [filteredTimetable])

  // Get unique subjects for the selected class
  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(filteredTimetable.map(entry => entry.subject)))
  }, [filteredTimetable])

  // Get class statistics
  const classStats = useMemo(() => {
    const stats: { [key: string]: { totalSlots: number, uniqueSubjects: Set<string>, teachers: Set<string> } } = {}

    filteredTimetable.forEach(entry => {
      const className = entry.school_class.name
      if (!stats[className]) {
        stats[className] = { totalSlots: 0, uniqueSubjects: new Set<string>(), teachers: new Set<string>() }
      }
      stats[className].totalSlots++
      stats[className].uniqueSubjects.add(entry.subject)
      if (entry.teacher) {
        stats[className].teachers.add(`${entry.teacher.user.first_name} ${entry.teacher.user.last_name}`)
      }
    })

    return Object.entries(stats).map(([className, data]) => ({
      className,
      totalSlots: data.totalSlots,
      uniqueSubjects: data.uniqueSubjects.size,
      teachers: data.teachers.size
    }))
  }, [filteredTimetable])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Loading timetable data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Error loading timetable</div>
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchTimetableData} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            School Timetable Overview
          </h2>
          <p className="text-gray-600 mt-2">
            Complete schedule for all classes and subjects
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={fetchTimetableData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {classStats.map((stat, index) => (
          <Card key={stat.className} className="card-hover animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                {stat.className}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stat.totalSlots}</div>
                  <div className="text-sm text-gray-600">Slots</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stat.uniqueSubjects}</div>
                  <div className="text-sm text-gray-600">Subjects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stat.teachers}</div>
                  <div className="text-sm text-gray-600">Teachers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timetable Grid */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>
            {selectedClassId === "all" ? "All classes" : `${classes.find(c => c.id.toString() === selectedClassId)?.name}`}
            • {filteredTimetable.length} total slots • {uniqueSubjects.length} subjects
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              {/* Time Header Row - Horizontal */}
              <div className="grid grid-cols-11 gap-1 p-4 bg-gray-50 border-b">
                <div className="font-semibold text-center py-2">Day</div>
                {TIME_SLOTS.map((timeSlot) => (
                  <div key={timeSlot} className="font-semibold text-center py-2">
                    <div className="text-sm">{timeSlot}</div>
                    <div className="text-xs text-gray-500">
                      {parseInt(timeSlot) + 1}:00
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Rows - Vertical */}
              {WEEK_DAYS.map((day) => (
                <div key={day.value} className="grid grid-cols-11 gap-1 p-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  {/* Day Column */}
                  <div className="text-center py-2">
                    <div className="font-medium text-sm">{day.label}</div>
                    <div className="text-xs text-gray-500">{day.value}</div>
                  </div>

                  {/* Time Slot Columns */}
                  {TIME_SLOTS.map((timeSlot) => {
                    const slots = timetableGrid[day.value][timeSlot] || []

                    return (
                      <div key={`${day.value}-${timeSlot}`} className="min-h-[80px] p-1">
                        {slots.length > 0 ? (
                          <div className="space-y-1">
                            {slots.map((entry) => (
                              <div
                                key={entry.id}
                                className={`p-2 rounded-lg border text-xs ${getSubjectColor(entry.subject, entry.school_class.name)} card-hover`}
                              >
                                <div className="font-semibold truncate" title={entry.subject}>
                                  {entry.subject}
                                </div>
                                <div className="text-xs opacity-80 truncate" title={entry.school_class.name}>
                                  {entry.school_class.name}
                                </div>
                                {entry.teacher && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarFallback className="text-[8px]">
                                        {entry.teacher.user.first_name[0]}{entry.teacher.user.last_name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] truncate">
                                      {entry.teacher.user.first_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-300">
                            <div className="text-xs">-</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject Legend</CardTitle>
          <CardDescription>Color coding for different subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {uniqueSubjects.map((subject, index) => (
              <div key={subject} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${SUBJECT_COLORS[index % SUBJECT_COLORS.length].split(' ')[0]}`}></div>
                <span className="text-sm font-medium">{subject}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}