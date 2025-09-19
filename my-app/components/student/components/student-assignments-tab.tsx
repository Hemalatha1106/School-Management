"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmationDialog } from "../../principal/confirmation-dialog"
import {
  FileText,
  Upload,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Send,
  Loader2,
  X,
} from "lucide-react"

interface Assignment {
  id: number
  title: string
  description: string
  subject: string
  dueDate: string
  status: string
  teacher: string
}

interface StudentAssignmentsTabProps {
  assignments: Assignment[]
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmitAssignment: () => void
  uploadedFiles: File[]
  uploadProgress: number
  isUploading: boolean
  selectedAssignment: Assignment | null
  setSelectedAssignment: (assignment: Assignment | null) => void
  showSubmitConfirmation: boolean
  setShowSubmitConfirmation: (show: boolean) => void
}

export default function StudentAssignmentsTab({
  assignments,
  handleFileUpload,
  handleSubmitAssignment,
  uploadedFiles,
  uploadProgress,
  isUploading,
  selectedAssignment,
  setSelectedAssignment,
  showSubmitConfirmation,
  setShowSubmitConfirmation
}: StudentAssignmentsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === "" ||
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter
    const matchesSubject = subjectFilter === "all" || assignment.subject === subjectFilter

    return matchesSearch && matchesStatus && matchesSubject
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const subjects = [...new Set(assignments.map(a => a.subject))]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Assignments</h2>
          <p className="text-muted-foreground">View and submit your assignments</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {filteredAssignments.length} Assignments
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
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setSubjectFilter("all")
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((assignment) => {
            const daysUntilDue = getDaysUntilDue(assignment.dueDate)
            const isOverdue = daysUntilDue < 0
            const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3

            return (
              <Card key={assignment.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                        <FileText className="h-5 w-5" />
                        {assignment.title}
                      </CardTitle>
                      <CardDescription className="text-blue-600 mt-1">
                        {assignment.subject} • {assignment.teacher}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className={getStatusColor(assignment.status)}>
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {assignment.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                      {isDueSoon && !isOverdue && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                          Due Soon
                        </Badge>
                      )}
                    </div>

                    {daysUntilDue >= 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{daysUntilDue} days left</span>
                          <span>{Math.max(0, 100 - (daysUntilDue * 10))}% urgency</span>
                        </div>
                        <Progress
                          value={Math.max(0, 100 - (daysUntilDue * 10))}
                          className="h-2"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-blue-50"
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {assignment.status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 hover:bg-green-50"
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setShowSubmitConfirmation(true)
                          }}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Assignments Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || subjectFilter !== "all"
                ? "No assignments match your current filters."
                : "You don't have any assignments yet."}
            </p>
            {(searchTerm || statusFilter !== "all" || subjectFilter !== "all") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setSubjectFilter("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Assignment Details Modal */}
      <Dialog open={!!selectedAssignment && !showSubmitConfirmation} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedAssignment?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment?.subject} • Due: {selectedAssignment ? new Date(selectedAssignment.dueDate).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-gray-600">{selectedAssignment?.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Subject:</span> {selectedAssignment?.subject}
              </div>
              <div>
                <span className="font-medium">Teacher:</span> {selectedAssignment?.teacher}
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge variant="secondary" className={`ml-2 ${getStatusColor(selectedAssignment?.status || '')}`}>
                  {selectedAssignment?.status}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Due Date:</span> {selectedAssignment ? new Date(selectedAssignment.dueDate).toLocaleDateString() : ''}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAssignment(null)}>
              Close
            </Button>
            {selectedAssignment?.status !== 'completed' && (
              <Button
                onClick={() => setShowSubmitConfirmation(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Assignment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Modal */}
      <Dialog open={showSubmitConfirmation} onOpenChange={setShowSubmitConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Submit Assignment
            </DialogTitle>
            <DialogDescription>
              Submit your work for "{selectedAssignment?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload files</p>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 10MB each</p>
                </label>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Uploaded Files ({uploadedFiles.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFiles = uploadedFiles.filter((_, i) => i !== index)
                          // Note: This would need to be handled by parent component
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirmation(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAssignment}
              disabled={uploadedFiles.length === 0 || isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Confirm Submission"
        description="Are you sure you want to submit this assignment? You won't be able to make changes after submission."
        confirmText="Submit"
        variant="default"
        isLoading={false}
      />
    </div>
  )
}