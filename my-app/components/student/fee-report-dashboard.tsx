"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"

// Base URL for API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from "recharts"

// Interfaces for Report Data
interface PieChartData {
  paid_count: number;
  paid_total: number;
  unpaid_count: number;
  unpaid_total: number;
}

interface ClassBreakdown {
  class_name: string;
  pending_amount: number;
  student_count: number;
}

interface ReportData {
  pie_chart: PieChartData;
  class_breakdown: ClassBreakdown[];
}

export function FeeReportDashboard() {
  const { toast } = useToast()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiClient.get<ReportData>("/fees/actions/?action=summary")
        if (response.success && response.data) {
          setReportData(response.data)
        } else {
          throw new Error(response.message || "Failed to fetch report data.")
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReportData()
  }, [])

  const handleGeneratePdf = () => {
    const reportUrl = `${API_BASE_URL}/fees/actions/?action=generate_report`
    window.open(reportUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return <p>No report data available.</p>
  }

  const pieData = [
    { name: "Paid Fees", value: reportData.pie_chart.paid_count },
    { name: "Unpaid/Partial Fees", value: reportData.pie_chart.unpaid_count },
  ]
  const COLORS = ["#16a34a", "#f97316"] // Green for Paid, Orange for Unpaid

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fee Analytics Report</h3>
          <p className="text-sm text-muted-foreground">An overview of fee collection status.</p>
        </div>
        <Button onClick={handleGeneratePdf}>
          <Download className="h-4 w-4 mr-2" />
          Generate PDF Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Status Overview</CardTitle>
            <CardDescription>Distribution of paid vs. unpaid fee records.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) => entry.value}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} Records`, name]} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Fees by Class</CardTitle>
            <CardDescription>Classes with the highest outstanding fee amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.class_breakdown.map((item) => (
                <div key={item.class_name} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <p className="font-medium">{item.class_name} ({item.student_count} students)</p>
                    <p className="font-mono text-muted-foreground">₹{item.pending_amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}