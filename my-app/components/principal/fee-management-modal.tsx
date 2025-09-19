"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  Calculator,
  Save,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  GraduationCap,
  BookOpen,
  Gamepad2,
  Music,
  Palette,
  Users,
  FileText
} from "lucide-react"

// Fee Structure Interface
interface ClassFeeStructure {
  id?: number
  class_id: number
  class_name: string
  academic_year: string
  tuition_fee: number
  extracurricular_fees: {
    sports: number
    arts: number
    music: number
    clubs: number
  }
  miscellaneous_fees: {
    transportation: number
    lunch: number
    stationery: number
    examination: number
    development: number
  }
  total_fee: number
  created_at?: string
  updated_at?: string
}

interface SchoolClass {
  id: number
  name: string
  grade_level: string
  section: string
  students_count?: number
}

interface FeeManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export default function FeeManagementModal({
  isOpen,
  onClose,
  onUpdate
}: FeeManagementModalProps) {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [feeStructures, setFeeStructures] = useState<ClassFeeStructure[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [editingStructure, setEditingStructure] = useState<ClassFeeStructure | null>(null)
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [activeTab, setActiveTab] = useState("overview")

  // Form state for new fee structure
  const [newFeeStructure, setNewFeeStructure] = useState({
    tuition_fee: 0,
    extracurricular_fees: {
      sports: 0,
      arts: 0,
      music: 0,
      clubs: 0
    },
    miscellaneous_fees: {
      transportation: 0,
      lunch: 0,
      stationery: 0,
      examination: 0,
      development: 0
    }
  })

  // Fetch classes and fee structures
  useEffect(() => {
    if (isOpen) {
      fetchClasses()
      fetchFeeStructures()
    }
  }, [isOpen])

  const fetchClasses = async () => {
    try {
      const response = await api.classes.list()
      if (response.success && Array.isArray(response.data)) {
        // Enhance classes with grade level information
        const enhancedClasses = response.data.map((cls: any) => ({
          ...cls,
          grade_level: getGradeLevel(cls.name),
          section: cls.name.split(' ')[1] || 'A'
        }))
        setClasses(enhancedClasses)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load classes"
      })
    }
  }

  const fetchFeeStructures = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would fetch from the fee structures API
      // For now, we'll simulate with sample data
      const sampleStructures: ClassFeeStructure[] = classes.map(cls => ({
        id: cls.id,
        class_id: cls.id,
        class_name: cls.name,
        academic_year: academicYear,
        tuition_fee: getBaseTuitionFee(cls.grade_level),
        extracurricular_fees: {
          sports: getExtracurricularFee('sports', cls.grade_level),
          arts: getExtracurricularFee('arts', cls.grade_level),
          music: getExtracurricularFee('music', cls.grade_level),
          clubs: getExtracurricularFee('clubs', cls.grade_level)
        },
        miscellaneous_fees: {
          transportation: 1200,
          lunch: 800,
          stationery: 400,
          examination: 300,
          development: 500
        },
        total_fee: 0 // Will be calculated
      }))

      // Calculate total fees
      sampleStructures.forEach(structure => {
        structure.total_fee = calculateTotalFee(structure)
      })

      setFeeStructures(sampleStructures)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load fee structures"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getGradeLevel = (className: string): string => {
    const grade = className.split(' ')[0]
    const gradeNum = parseInt(grade)
    if (gradeNum >= 1 && gradeNum <= 5) return 'primary'
    if (gradeNum >= 6 && gradeNum <= 10) return 'secondary'
    if (gradeNum >= 11 && gradeNum <= 12) return 'senior'
    return 'other'
  }

  const getBaseTuitionFee = (gradeLevel: string): number => {
    const baseFees = {
      primary: 15000,
      secondary: 20000,
      senior: 25000,
      other: 18000
    }
    return baseFees[gradeLevel as keyof typeof baseFees] || 18000
  }

  const getExtracurricularFee = (activity: string, gradeLevel: string): number => {
    const activityFees = {
      sports: { primary: 800, secondary: 1200, senior: 1500 },
      arts: { primary: 600, secondary: 900, senior: 1100 },
      music: { primary: 700, secondary: 1000, senior: 1300 },
      clubs: { primary: 400, secondary: 600, senior: 800 }
    }
    return activityFees[activity as keyof typeof activityFees]?.[gradeLevel as keyof typeof activityFees[keyof typeof activityFees]] || 0
  }

  const calculateTotalFee = (structure: ClassFeeStructure): number => {
    const extracurricularTotal = Object.values(structure.extracurricular_fees).reduce((sum, fee) => sum + fee, 0)
    const miscellaneousTotal = Object.values(structure.miscellaneous_fees).reduce((sum, fee) => sum + fee, 0)
    return structure.tuition_fee + extracurricularTotal + miscellaneousTotal
  }

  const handleSaveFeeStructure = async () => {
    if (!selectedClass) return

    setIsSaving(true)
    try {
      const structureData: ClassFeeStructure = {
        class_id: selectedClass.id,
        class_name: selectedClass.name,
        academic_year: academicYear,
        tuition_fee: newFeeStructure.tuition_fee,
        extracurricular_fees: newFeeStructure.extracurricular_fees,
        miscellaneous_fees: newFeeStructure.miscellaneous_fees,
        total_fee: calculateTotalFee({
          ...newFeeStructure,
          class_id: selectedClass.id,
          class_name: selectedClass.name,
          academic_year: academicYear
        } as ClassFeeStructure)
      }

      // In a real implementation, this would save to the database
      // For now, we'll update the local state
      const updatedStructures = feeStructures.map(structure =>
        structure.class_id === selectedClass.id ? { ...structure, ...structureData } : structure
      )

      if (!updatedStructures.find(s => s.class_id === selectedClass.id)) {
        updatedStructures.push({ ...structureData, id: Date.now() })
      }

      setFeeStructures(updatedStructures)

      toast({
        title: "Success",
        description: `Fee structure for ${selectedClass.name} saved successfully`
      })

      // Reset form
      setNewFeeStructure({
        tuition_fee: 0,
        extracurricular_fees: { sports: 0, arts: 0, music: 0, clubs: 0 },
        miscellaneous_fees: { transportation: 0, lunch: 0, stationery: 0, examination: 0, development: 0 }
      })
      setSelectedClass(null)

      onUpdate?.()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save fee structure"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAllFeeStructures = async () => {
    setIsSaving(true)
    try {
      const generatedStructures: ClassFeeStructure[] = classes.map(cls => ({
        id: cls.id,
        class_id: cls.id,
        class_name: cls.name,
        academic_year: academicYear,
        tuition_fee: getBaseTuitionFee(cls.grade_level),
        extracurricular_fees: {
          sports: getExtracurricularFee('sports', cls.grade_level),
          arts: getExtracurricularFee('arts', cls.grade_level),
          music: getExtracurricularFee('music', cls.grade_level),
          clubs: getExtracurricularFee('clubs', cls.grade_level)
        },
        miscellaneous_fees: {
          transportation: 1200,
          lunch: 800,
          stationery: 400,
          examination: 300,
          development: 500
        },
        total_fee: 0
      }))

      // Calculate totals
      generatedStructures.forEach(structure => {
        structure.total_fee = calculateTotalFee(structure)
      })

      setFeeStructures(generatedStructures)

      toast({
        title: "Success",
        description: `Generated fee structures for all ${classes.length} classes`
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate fee structures"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditStructure = (structure: ClassFeeStructure) => {
    setEditingStructure(structure)
    setNewFeeStructure({
      tuition_fee: structure.tuition_fee,
      extracurricular_fees: { ...structure.extracurricular_fees },
      miscellaneous_fees: { ...structure.miscellaneous_fees }
    })
    setSelectedClass(classes.find(c => c.id === structure.class_id) || null)
  }

  const handleUpdateStructure = async () => {
    if (!editingStructure || !selectedClass) return

    setIsSaving(true)
    try {
      const updatedStructure: ClassFeeStructure = {
        ...editingStructure,
        tuition_fee: newFeeStructure.tuition_fee,
        extracurricular_fees: newFeeStructure.extracurricular_fees,
        miscellaneous_fees: newFeeStructure.miscellaneous_fees,
        total_fee: calculateTotalFee({
          ...newFeeStructure,
          class_id: selectedClass.id,
          class_name: selectedClass.name,
          academic_year: academicYear
        } as ClassFeeStructure)
      }

      const updatedStructures = feeStructures.map(structure =>
        structure.id === editingStructure.id ? updatedStructure : structure
      )

      setFeeStructures(updatedStructures)

      toast({
        title: "Success",
        description: `Fee structure for ${selectedClass.name} updated successfully`
      })

      setEditingStructure(null)
      setSelectedClass(null)
      setNewFeeStructure({
        tuition_fee: 0,
        extracurricular_fees: { sports: 0, arts: 0, music: 0, clubs: 0 },
        miscellaneous_fees: { transportation: 0, lunch: 0, stationery: 0, examination: 0, development: 0 }
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update fee structure"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportFeeStructures = () => {
    const exportData = [
      ["Fee Structures Export"],
      ["Academic Year: " + academicYear],
      ["Generated: " + new Date().toLocaleDateString()],
      [""],
      ["Class", "Grade Level", "Tuition Fee", "Extracurricular", "Miscellaneous", "Total Fee"],
      ...feeStructures.map(structure => [
        structure.class_name,
        classes.find(c => c.id === structure.class_id)?.grade_level || "",
        `₹${structure.tuition_fee.toLocaleString()}`,
        `₹${Object.values(structure.extracurricular_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}`,
        `₹${Object.values(structure.miscellaneous_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}`,
        `₹${structure.total_fee.toLocaleString()}`
      ])
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(exportData)
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, "Fee Structures")
    XLSX.writeFile(wb, `Fee_Structures_${academicYear}_${new Date().toISOString().split('T')[0]}.xlsx`)

    toast({
      title: "Export Complete",
      description: "Fee structures exported to Excel successfully"
    })
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading fee structures...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fee Management System
          </DialogTitle>
          <DialogDescription>
            Manage annual fee structures for all classes. Create, edit, and generate fee structures dynamically based on class levels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Label>Academic Year:</Label>
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={(new Date().getFullYear()).toString()}>
                  {new Date().getFullYear()}
                </SelectItem>
                <SelectItem value={(new Date().getFullYear() + 1).toString()}>
                  {new Date().getFullYear() + 1}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerateAllFeeStructures}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
            Generate All Fee Structures
          </Button>
          <Button
            variant="outline"
            onClick={handleExportFeeStructures}
            disabled={feeStructures.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="manage">Manage Fees</TabsTrigger>
            <TabsTrigger value="create">Create/Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fee Structures Overview</CardTitle>
                <CardDescription>
                  Current fee structures for {feeStructures.length} classes in {academicYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Tuition Fee</TableHead>
                      <TableHead>Extracurricular</TableHead>
                      <TableHead>Miscellaneous</TableHead>
                      <TableHead>Total Fee</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructures.map((structure) => (
                      <TableRow key={structure.class_id}>
                        <TableCell className="font-medium">{structure.class_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {classes.find(c => c.id === structure.class_id)?.grade_level}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{structure.tuition_fee.toLocaleString()}</TableCell>
                        <TableCell>
                          ₹{Object.values(structure.extracurricular_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ₹{Object.values(structure.miscellaneous_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ₹{structure.total_fee.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStructure(structure)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const structure = feeStructures.find(s => s.class_id === cls.id)
                return (
                  <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <Badge variant="outline">{cls.grade_level}</Badge>
                      </div>
                      <CardDescription>
                        {structure ? `Total: ₹${structure.total_fee.toLocaleString()}` : 'No fee structure'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {structure ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Tuition:</span>
                            <span>₹{structure.tuition_fee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Activities:</span>
                            <span>₹{Object.values(structure.extracurricular_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Misc:</span>
                            <span>₹{Object.values(structure.miscellaneous_fees).reduce((sum, fee) => sum + fee, 0).toLocaleString()}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => handleEditStructure(structure)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Fees
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm mb-3">No fee structure created</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedClass(cls)
                              setNewFeeStructure({
                                tuition_fee: getBaseTuitionFee(cls.grade_level),
                                extracurricular_fees: {
                                  sports: getExtracurricularFee('sports', cls.grade_level),
                                  arts: getExtracurricularFee('arts', cls.grade_level),
                                  music: getExtracurricularFee('music', cls.grade_level),
                                  clubs: getExtracurricularFee('clubs', cls.grade_level)
                                },
                                miscellaneous_fees: {
                                  transportation: 1200,
                                  lunch: 800,
                                  stationery: 400,
                                  examination: 300,
                                  development: 500
                                }
                              })
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Structure
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
                </CardTitle>
                <CardDescription>
                  {selectedClass ? `Configure fees for ${selectedClass.name}` : 'Select a class to configure fees'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedClass && !editingStructure && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {classes.map((cls) => (
                      <Button
                        key={cls.id}
                        variant="outline"
                        className="h-16 flex flex-col items-center gap-1"
                        onClick={() => {
                          setSelectedClass(cls)
                          const existingStructure = feeStructures.find(s => s.class_id === cls.id)
                          if (existingStructure) {
                            setNewFeeStructure({
                              tuition_fee: existingStructure.tuition_fee,
                              extracurricular_fees: { ...existingStructure.extracurricular_fees },
                              miscellaneous_fees: { ...existingStructure.miscellaneous_fees }
                            })
                          } else {
                            setNewFeeStructure({
                              tuition_fee: getBaseTuitionFee(cls.grade_level),
                              extracurricular_fees: {
                                sports: getExtracurricularFee('sports', cls.grade_level),
                                arts: getExtracurricularFee('arts', cls.grade_level),
                                music: getExtracurricularFee('music', cls.grade_level),
                                clubs: getExtracurricularFee('clubs', cls.grade_level)
                              },
                              miscellaneous_fees: {
                                transportation: 1200,
                                lunch: 800,
                                stationery: 400,
                                examination: 300,
                                development: 500
                              }
                            })
                          }
                        }}
                      >
                        <GraduationCap className="h-5 w-5" />
                        <span className="text-sm">{cls.name}</span>
                      </Button>
                    ))}
                  </div>
                )}

                {selectedClass && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                      <GraduationCap className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{selectedClass.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Grade Level: {selectedClass.grade_level} • Section: {selectedClass.section}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Tuition Fee
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label>Annual Tuition Fee (₹)</Label>
                            <Input
                              type="number"
                              value={newFeeStructure.tuition_fee}
                              onChange={(e) => setNewFeeStructure({
                                ...newFeeStructure,
                                tuition_fee: parseFloat(e.target.value) || 0
                              })}
                              placeholder="Enter tuition fee"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Gamepad2 className="h-4 w-4" />
                            Extracurricular Activities
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Sports (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.extracurricular_fees.sports}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  extracurricular_fees: {
                                    ...newFeeStructure.extracurricular_fees,
                                    sports: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Arts (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.extracurricular_fees.arts}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  extracurricular_fees: {
                                    ...newFeeStructure.extracurricular_fees,
                                    arts: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Music (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.extracurricular_fees.music}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  extracurricular_fees: {
                                    ...newFeeStructure.extracurricular_fees,
                                    music: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Clubs (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.extracurricular_fees.clubs}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  extracurricular_fees: {
                                    ...newFeeStructure.extracurricular_fees,
                                    clubs: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Miscellaneous Fees
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">Transportation (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.miscellaneous_fees.transportation}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  miscellaneous_fees: {
                                    ...newFeeStructure.miscellaneous_fees,
                                    transportation: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Lunch (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.miscellaneous_fees.lunch}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  miscellaneous_fees: {
                                    ...newFeeStructure.miscellaneous_fees,
                                    lunch: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Stationery (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.miscellaneous_fees.stationery}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  miscellaneous_fees: {
                                    ...newFeeStructure.miscellaneous_fees,
                                    stationery: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Examination (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.miscellaneous_fees.examination}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  miscellaneous_fees: {
                                    ...newFeeStructure.miscellaneous_fees,
                                    examination: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Development (₹)</Label>
                              <Input
                                type="number"
                                value={newFeeStructure.miscellaneous_fees.development}
                                onChange={(e) => setNewFeeStructure({
                                  ...newFeeStructure,
                                  miscellaneous_fees: {
                                    ...newFeeStructure.miscellaneous_fees,
                                    development: parseFloat(e.target.value) || 0
                                  }
                                })}
                              />
                            </div>
                            <div className="flex items-end">
                              <div className="p-3 bg-green-50 rounded-lg w-full">
                                <Label className="text-sm font-medium">Total Fee</Label>
                                <p className="text-lg font-bold text-green-600">
                                  ₹{calculateTotalFee({
                                    ...newFeeStructure,
                                    class_id: selectedClass.id,
                                    class_name: selectedClass.name,
                                    academic_year: academicYear
                                  } as ClassFeeStructure).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={editingStructure ? handleUpdateStructure : handleSaveFeeStructure}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {editingStructure ? 'Update Fee Structure' : 'Save Fee Structure'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedClass(null)
                          setEditingStructure(null)
                          setNewFeeStructure({
                            tuition_fee: 0,
                            extracurricular_fees: { sports: 0, arts: 0, music: 0, clubs: 0 },
                            miscellaneous_fees: { transportation: 0, lunch: 0, stationery: 0, examination: 0, development: 0 }
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}