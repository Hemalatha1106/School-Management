"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Trash2, FileText, BarChart3, Users, DollarSign, Calendar, Home, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Report {
  report_id: string
  generated_at: string
  report_type: string
  version: string
  includes: {
    academic: boolean
    financial: boolean
    attendance: boolean
    performance: boolean
    summary: boolean
  }
}

interface ReportFile {
  name: string
  path: string
  size: number
  type: string
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportFiles, setReportFiles] = useState<ReportFile[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("list")

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await api.reports.list()
      if (response.success) {
        setReports(response.data.reports || [])
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reports",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: string, format: string) => {
    try {
      setGenerating(true)
      const response = await api.reports.generate({
        report_type: reportType,
        format: format
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Report generated successfully",
        })
        loadReports() // Refresh the list
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report",
      })
    } finally {
      setGenerating(false)
    }
  }

  const loadReportFiles = async (reportId: string) => {
    try {
      const response = await api.reports.files(reportId)
      if (response.success) {
        setReportFiles(response.data.files || [])
        setSelectedReport(reports.find(r => r.report_id === reportId) || null)
        setActiveTab("files")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load report files",
      })
    }
  }

  const downloadFile = async (reportId: string, filePath: string, fileName: string) => {
    try {
      const response = await api.reports.download(reportId, { path: filePath })

      // Create a blob from the response and download it
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "File downloaded successfully",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download file",
      })
    }
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return

    try {
      const response = await api.reports.delete(reportId)
      if (response.success) {
        toast({
          title: "Success",
          description: "Report deleted successfully",
        })
        loadReports()
        setSelectedReport(null)
        setReportFiles([])
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete report",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'academic': return <Users className="h-4 w-4" />
      case 'financial': return <DollarSign className="h-4 w-4" />
      case 'attendance': return <Calendar className="h-4 w-4" />
      case 'performance': return <BarChart3 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports Management</h1>
          <p className="text-muted-foreground">
            Generate, view, and manage comprehensive school reports
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="list">Report List</TabsTrigger>
          <TabsTrigger value="files" disabled={!selectedReport}>Report Files</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
              <CardDescription>
                Create comprehensive reports for different aspects of school management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="academic">Academic Reports</SelectItem>
                      <SelectItem value="financial">Financial Reports</SelectItem>
                      <SelectItem value="attendance">Attendance Reports</SelectItem>
                      <SelectItem value="performance">Performance Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Format</label>
                  <Select defaultValue="json">
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => generateReport("all", "json")}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>
                {reports.length} report{reports.length !== 1 ? 's' : ''} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No reports available. Generate your first report to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.report_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getReportTypeIcon(report.report_type)}
                          <div>
                            <p className="font-medium">{report.report_id}</p>
                            <p className="text-sm text-muted-foreground">
                              Generated: {formatDate(report.generated_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(report.includes).map(([key, included]) =>
                            included ? (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}
                              </Badge>
                            ) : null
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadReportFiles(report.report_id)}
                        >
                          View Files
                        </Button>
                        {user?.role === 'principal' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteReport(report.report_id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          {selectedReport && (
            <Card>
              <CardHeader>
                <CardTitle>Files in {selectedReport.report_id}</CardTitle>
                <CardDescription>
                  Generated on {formatDate(selectedReport.generated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(selectedReport.report_id, file.path, file.name)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}