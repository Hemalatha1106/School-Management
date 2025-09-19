"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { api, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SchoolSettings {
  id?: number
  name: string
  address: string
  phone: string
  email: string
  website: string
  logo?: File | null
  logo_url?: string
  google_upi_id: string
  razorpay_id: string
  academic_year: string
  school_timings: string
}

export default function SchoolSettingsTab() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SchoolSettings>({
    name: "Springfield High School",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: null,
    logo_url: "",
    google_upi_id: "",
    razorpay_id: "",
    academic_year: "2024-2025",
    school_timings: "8:00 AM - 3:00 PM"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>("")

  // Fetch school settings on component mount
  useEffect(() => {
    const fetchSchoolSettings = async () => {
      try {
        const response = await api.school.list()
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const schoolData = response.data[0]
          setSettings({
            id: schoolData.id,
            name: schoolData.name || "Springfield High School",
            address: schoolData.address || "",
            phone: schoolData.phone || "",
            email: schoolData.email || "",
            website: schoolData.website || "",
            logo: null,
            logo_url: schoolData.logo_url || "",
            google_upi_id: schoolData.google_upi_id || "",
            razorpay_id: schoolData.razorpay_id || "",
            academic_year: schoolData.academic_year || "2024-2025",
            school_timings: schoolData.school_timings || "8:00 AM - 3:00 PM"
          })
          setLogoPreview(schoolData.logo_url || "")
        } else if (response.success && (!response.data || (Array.isArray(response.data) && response.data.length === 0))) {
          // No school exists yet, use default settings
          console.log('No school settings found, using defaults')
        } else {
          throw new Error(response.message || "Failed to fetch school settings")
        }
      } catch (error) {
        console.error('Error fetching school settings:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load school settings. Using default settings.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchoolSettings()
  }, [toast])

  const handleInputChange = (field: keyof SchoolSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSettings(prev => ({ ...prev, logo: file }))
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async () => {
    // Validation
    if (!settings.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "School name is required",
      })
      return
    }

    if (!settings.academic_year.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Academic year is required",
      })
      return
    }

    setIsSaving(true)

    try {
      // Prepare form data for file upload
      const formData = new FormData()
      formData.append('name', settings.name)
      formData.append('address', settings.address)
      formData.append('phone', settings.phone)
      formData.append('email', settings.email)
      formData.append('website', settings.website)
      formData.append('google_upi_id', settings.google_upi_id)
      formData.append('razorpay_id', settings.razorpay_id)
      formData.append('academic_year', settings.academic_year)
      formData.append('school_timings', settings.school_timings)

      if (settings.logo) {
        formData.append('logo', settings.logo)
      }

      let response
      if (settings.id) {
        // Update existing school
        response = await apiClient.patch(`/school/${settings.id}/`, formData)
      } else {
        // Create new school
        response = await apiClient.post('/school/', formData)
      }

      if (response.success) {
        const updatedData = response.data as any
        setSettings(prev => ({
          ...prev,
          id: updatedData.id,
          logo_url: updatedData.logo_url || prev.logo_url
        }))

        toast({
          title: "Settings Saved",
          description: "School settings have been updated successfully",
        })
      } else {
        throw new Error(response.message || "Failed to save settings")
      }
    } catch (error: any) {
      console.error('Error saving school settings:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save school settings",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading school settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">School Settings</h2>
          <p className="text-muted-foreground">Configure school-wide settings and preferences</p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>School name, contact details, and website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                value={settings.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter school name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-address">Address</Label>
              <Textarea
                id="school-address"
                value={settings.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter school address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone</Label>
                <Input
                  id="school-phone"
                  value={settings.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input
                  id="school-email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-website">Website</Label>
              <Input
                id="school-website"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.schoolwebsite.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* School Logo */}
        <Card>
          <CardHeader>
            <CardTitle>School Logo</CardTitle>
            <CardDescription>Upload and display the school logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={logoPreview} alt="School Logo" />
                <AvatarFallback className="text-lg">
                  {settings.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <Upload className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Click to upload logo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Settings</CardTitle>
            <CardDescription>Academic year and school timings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="academic-year">Academic Year *</Label>
              <Input
                id="academic-year"
                value={settings.academic_year}
                onChange={(e) => handleInputChange('academic_year', e.target.value)}
                placeholder="2024-2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-timings">School Timings</Label>
              <Input
                id="school-timings"
                value={settings.school_timings}
                onChange={(e) => handleInputChange('school_timings', e.target.value)}
                placeholder="8:00 AM - 3:00 PM"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>UPI and payment gateway configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-upi-id">Google UPI ID</Label>
              <Input
                id="google-upi-id"
                value={settings.google_upi_id}
                onChange={(e) => handleInputChange('google_upi_id', e.target.value)}
                placeholder="yourname@upi"
              />
              <p className="text-xs text-muted-foreground">
                Used for generating QR codes for fee payments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razorpay-id">Razorpay ID</Label>
              <Input
                id="razorpay-id"
                value={settings.razorpay_id}
                onChange={(e) => handleInputChange('razorpay_id', e.target.value)}
                placeholder="rzp_test_..."
              />
              <p className="text-xs text-muted-foreground">
                Razorpay merchant ID for online payments
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}