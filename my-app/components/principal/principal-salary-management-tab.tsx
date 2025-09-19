"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BarChart3,
  Clock,
  CheckCircle,
  Send,
  AlertCircle,
  Loader2,
  DollarSign,
  Plus
} from "lucide-react"

interface SalaryRecord {
  id: number
  user: {
    id: number
    first_name: string
    last_name: string
    role: string
  }
  monthly_salary: number
  payment_status: string
  last_payment_date: string
}

interface SchoolStats {
  total_users: number
  total_teachers: number
  total_students: number
  total_classes: number
  active_users: number
  monthly_payroll: number
  pending_payments: number
  paid_this_month: number
}

interface PrincipalSalaryManagementTabProps {
  salaries: SalaryRecord[]
  schoolStats: SchoolStats | null
  isProcessingPayroll: boolean
  payrollProcessed: boolean
  lastPayrollDate: string | null
  handleProcessPayroll: () => void
  handleUndoPayroll: () => void
  handleProcessIndividualPayroll: (salaryId: number) => void
  handleUndoIndividualPayroll: (salaryId: number) => void
  handleEditTeacherSalary: (userId: number) => void
}

export function PrincipalSalaryManagementTab({
  salaries,
  schoolStats,
  isProcessingPayroll,
  payrollProcessed,
  lastPayrollDate,
  handleProcessPayroll,
  handleUndoPayroll,
  handleProcessIndividualPayroll,
  handleUndoIndividualPayroll,
  handleEditTeacherSalary
}: PrincipalSalaryManagementTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Salary Management</h2>
          <p className="text-muted-foreground">Manage individual staff salaries and process payments</p>
        </div>
        <div className="flex gap-4">
          <Button
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
            onClick={handleProcessPayroll}
            disabled={isProcessingPayroll}
          >
            {isProcessingPayroll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isProcessingPayroll ? "Processing..." : "Process Payroll"}
          </Button>
          {payrollProcessed && (
            <Button onClick={handleUndoPayroll} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              <AlertCircle className="h-4 w-4 mr-2" />
              Undo Payroll
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-bold">
                  ₹{(schoolStats?.monthly_payroll || 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">
                  ₹{(schoolStats?.pending_payments || 0).toLocaleString()}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">
                  ₹{(schoolStats?.paid_this_month || 0).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Salary Details</CardTitle>
          <CardDescription>View and manage individual staff salaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salaries.length > 0 ? (
              salaries.map((salary) => (
                <div key={salary.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {salary.user.first_name?.[0]}{salary.user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{salary.user.first_name} {salary.user.last_name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{salary.user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-semibold">₹{salary.monthly_salary.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Monthly</p>
                    </div>
                    <Badge variant={salary.payment_status === 'paid' ? 'secondary' : 'outline'} className={salary.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {salary.payment_status}
                    </Badge>
                    {salary.payment_status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => handleProcessIndividualPayroll(salary.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoIndividualPayroll(salary.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Undo
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEditTeacherSalary(salary.user.id)}>View Details</Button>
                    {salary.user.role === 'teacher' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTeacherSalary(salary.user.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit Salary
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No salary records found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}