"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Edit, Save, Calculator, AlertCircle } from "lucide-react"

// --- TypeScript Interface for API Data ---
interface FeeType {
  id: number
  name: string
  amount: string // Django DecimalField serializes to string
  category: "Admission" | "Annual" | "Tuition" | "Transport" | "Other"
}

export function FeeStructureManagement() {
  const { toast } = useToast()
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingAmount, setEditingAmount] = useState("")

  // State for the calculator
  const [calculator, setCalculator] = useState({ months: 12, transport: 0 })
  const [tuitionFee, setTuitionFee] = useState(0)
  const [totalCost, setTotalCost] = useState(0)

  const fetchFeeTypes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.feeTypes.list()
      if (response.success && Array.isArray(response.data)) {
        setFeeTypes(response.data)
      } else {
        throw new Error(response.message || "Failed to fetch fee structure.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeeTypes()
  }, [])

  const handleEdit = (fee: FeeType) => {
    setEditingId(fee.id)
    setEditingAmount(parseFloat(fee.amount).toString())
  }

  const handleSave = async (id: number) => {
    try {
      const response = await api.feeTypes.update(id, { amount: parseFloat(editingAmount) })
      if (response.success) {
        toast({ title: "Success", description: "Fee amount updated successfully." })
        setEditingId(null)
        fetchFeeTypes() // Refresh data from the server
      } else {
        throw new Error(response.message || "Failed to update fee.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  // Calculate the total estimated cost whenever calculator inputs change
  useEffect(() => {
    if (feeTypes.length === 0) return

    const admission = feeTypes.filter(f => f.category === 'Admission').reduce((sum, f) => sum + parseFloat(f.amount), 0)
    const annual = feeTypes.filter(f => f.category === 'Annual').reduce((sum, f) => sum + parseFloat(f.amount), 0)
    const tuition = tuitionFee * calculator.months
    const transport = calculator.transport * calculator.months
    
    setTotalCost(admission + annual + tuition + transport)
  }, [calculator, tuitionFee, feeTypes])


  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
  
  if (error) {
    return <Card className="border-red-200 bg-red-50"><CardContent className="pt-4"><p className="text-red-700">{error}</p></CardContent></Card>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Structure Management</CardTitle>
            <CardDescription>Edit the default amounts for each fee type in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {feeTypes.map(fee => (
              <div key={fee.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{fee.name}</p>
                  <p className="text-xs text-muted-foreground">{fee.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === fee.id ? (
                    <>
                      <Input type="number" value={editingAmount} onChange={e => setEditingAmount(e.target.value)} className="w-28 h-9" />
                      <Button size="sm" onClick={() => handleSave(fee.id)}><Save className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-sm">₹{parseFloat(fee.amount).toLocaleString('en-IN')}</p>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(fee)}><Edit className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee Calculator</CardTitle>
            <CardDescription>Estimate the total annual cost for a prospective student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tuition Level</Label>
              <Select onValueChange={val => setTuitionFee(parseFloat(val))}>
                <SelectTrigger><SelectValue placeholder="Select a grade level" /></SelectTrigger>
                <SelectContent>
                  {feeTypes.filter(f => f.category === 'Tuition').map(f => <SelectItem key={f.id} value={f.amount}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transport Plan (Optional)</Label>
              <Select onValueChange={val => setCalculator(prev => ({...prev, transport: parseFloat(val)}))}>
                <SelectTrigger><SelectValue placeholder="Select transport option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Transport</SelectItem>
                  {feeTypes.filter(f => f.category === 'Transport').map(f => <SelectItem key={f.id} value={f.amount}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <p>Estimated Annual Cost:</p>
                <p className="font-mono text-primary">₹{totalCost.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Includes one-time admission fees and annual charges.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}