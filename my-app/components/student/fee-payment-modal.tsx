"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { QrCode, CreditCard, CheckCircle, AlertCircle, Copy, Loader2, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api, apiClient } from "@/lib/api"

interface FeePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  fee: {
    id: number
    student: {
      user: { id: number; first_name: string; last_name: string }
      school_class: string
    }
    amount: string
    due_date: string
    status: "paid" | "unpaid" | "partial"
  } | null
  onPaymentSuccess?: () => void
}

interface SchoolSettings {
  google_upi_id?: string
  razorpay_id?: string
  name: string
}

export function FeePaymentModal({ isOpen, onClose, fee, onPaymentSuccess }: FeePaymentModalProps) {
  const { toast } = useToast()
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'manual'>('upi')
  const [transactionId, setTransactionId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  // Fetch school settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchSchoolSettings = async () => {
        try {
          const response = await apiClient.get('/school/')
          if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            const settings = response.data[0] as SchoolSettings
            setSchoolSettings(settings)

            // Set default payment method based on available options
            if (settings.razorpay_id) {
              setPaymentMethod('razorpay')
            } else if (settings.google_upi_id) {
              setPaymentMethod('upi')
            } else {
              setPaymentMethod('manual')
            }
          }
        } catch (error) {
          console.error('Error fetching school settings:', error)
        }
      }
      fetchSchoolSettings()
    }
  }, [isOpen])

  // Generate QR code when fee and school settings are available
  useEffect(() => {
    if (fee && schoolSettings?.google_upi_id) {
      generateUPIQR()
    }
  }, [fee, schoolSettings])

  const generateUPIQR = () => {
    if (!fee || !schoolSettings?.google_upi_id) return

    const amount = parseFloat(fee.amount)
    const upiId = schoolSettings.google_upi_id
    const schoolName = schoolSettings.name || 'School'

    // Generate UPI payment string
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(schoolName)}&am=${amount}&cu=INR&tn=Fee Payment`

    // For demo purposes, we'll use a placeholder QR code service
    // In production, you'd use a proper QR code generation service
    const qrCodeSize = 200
    const qrCodeData = encodeURIComponent(upiString)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${qrCodeData}`

    setQrCodeUrl(qrCodeUrl)
  }

  const copyUPIId = () => {
    if (schoolSettings?.google_upi_id) {
      navigator.clipboard.writeText(schoolSettings.google_upi_id)
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      })
    }
  }

  const handleRazorpayPayment = async () => {
    if (!fee || !schoolSettings?.razorpay_id) return

    setIsProcessing(true)

    try {
      // Load Razorpay script dynamically
      if (!(window as any).Razorpay) {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)

        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
        })
      }

      // Create order on backend
      const orderResponse = await apiClient.post('/payments/create-order/', {
        fee_id: fee.id,
        amount: parseFloat(fee.amount),
      })

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order')
      }

      const orderData = orderResponse.data as {
        amount: number
        currency: string
        id: string
      }

      const options = {
        key: schoolSettings.razorpay_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: schoolSettings.name || 'School',
        description: `Fee Payment - ${fee.student.user.first_name} ${fee.student.user.last_name}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Verify payment on backend
            const verifyResponse = await apiClient.post('/payments/verify/', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              fee_id: fee.id,
            })

            if (verifyResponse.success) {
              toast({
                title: "Payment Successful!",
                description: `Payment of ₹${fee.amount} has been confirmed.`,
              })
              onPaymentSuccess?.()
              onClose()
            } else {
              throw new Error('Payment verification failed')
            }
          } catch (error: any) {
            toast({
              variant: "destructive",
              title: "Payment Verification Failed",
              description: error.message || "Please contact support if amount was debited.",
            })
          }
        },
        prefill: {
          name: `${fee.student.user.first_name} ${fee.student.user.last_name}`,
          email: '', // Could be fetched from user data
          contact: '', // Could be fetched from user data
        },
        theme: {
          color: '#10b981', // Green color matching the app theme
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()

    } catch (error: any) {
      console.error('Razorpay payment error:', error)
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentConfirmation = async () => {
    if (!fee) return

    if (paymentMethod === 'manual' && !transactionId.trim()) {
      toast({
        variant: "destructive",
        title: "Transaction ID Required",
        description: "Please enter the transaction ID for manual payment confirmation.",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Process payment through the dedicated payment endpoint
      const paymentData = {
        fee_id: fee.id,
        amount: parseFloat(fee.amount),
        payment_method: paymentMethod,
        transaction_id: paymentMethod === 'manual' ? transactionId : null,
        notes: paymentNotes
      }

      const paymentResponse = await apiClient.post('/payments/process/', paymentData)

      if (paymentResponse.success) {
        toast({
          title: "Payment Successful!",
          description: `Payment of ₹${fee.amount} has been confirmed.`,
        })

        onPaymentSuccess?.()
        onClose()
      } else {
        throw new Error(paymentResponse.message || "Failed to process payment")
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error)
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.message || "Failed to confirm payment. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!fee) return null

  const amount = parseFloat(fee.amount)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fee Payment
          </DialogTitle>
          <DialogDescription>
            Complete your fee payment securely
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {fee.student.user.first_name?.[0]}{fee.student.user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{fee.student.user.first_name} {fee.student.user.last_name}</p>
                    <p className="text-sm text-muted-foreground">Class {fee.student.school_class}</p>
                  </div>
                </div>
                <Badge variant={fee.status === 'paid' ? 'secondary' : 'outline'}>
                  {fee.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount Due:</span>
                  <span className="font-semibold text-lg">₹{amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Due Date:</span>
                  <span className="text-sm">{new Date(fee.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Payment Method</Label>
            <div className={`grid gap-3 ${schoolSettings?.razorpay_id ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {schoolSettings?.razorpay_id && (
                <Button
                  variant={paymentMethod === 'razorpay' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('razorpay')}
                  className="h-16 flex flex-col gap-1"
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs">Razorpay</span>
                </Button>
              )}
              <Button
                variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('upi')}
                className="h-16 flex flex-col gap-1"
                disabled={!schoolSettings?.google_upi_id}
              >
                <QrCode className="h-5 w-5" />
                <span className="text-xs">UPI QR Code</span>
              </Button>
              <Button
                variant={paymentMethod === 'manual' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('manual')}
                className="h-16 flex flex-col gap-1"
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Manual Entry</span>
              </Button>
            </div>
          </div>

          {/* Razorpay Payment Section */}
          {paymentMethod === 'razorpay' && schoolSettings?.razorpay_id && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Secure Online Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Smartphone className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Pay securely using Razorpay with multiple payment options
                  </p>
                  <Button
                    onClick={handleRazorpayPayment}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Pay ₹{amount.toFixed(2)} with Razorpay
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">Secure Payment Features:</p>
                      <ul className="text-green-700 mt-1 space-y-1">
                        <li>• Multiple payment options (Card, UPI, Net Banking, Wallet)</li>
                        <li>• 256-bit SSL encryption</li>
                        <li>• PCI DSS compliant</li>
                        <li>• Instant payment confirmation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* UPI Payment Section */}
          {paymentMethod === 'upi' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Scan QR Code to Pay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrCodeUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-48 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                    </div>
                  </div>
                )}

                {schoolSettings?.google_upi_id && (
                  <div className="space-y-2">
                    <Label className="text-sm">Or pay manually using UPI ID:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={schoolSettings.google_upi_id}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyUPIId}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Payment Instructions:</p>
                      <ul className="text-blue-700 mt-1 space-y-1">
                        <li>• Scan the QR code with any UPI app</li>
                        <li>• Verify the amount before paying</li>
                        <li>• Keep the transaction ID for reference</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Payment Section */}
          {paymentMethod === 'manual' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Manual Payment Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-id">Transaction ID *</Label>
                  <Input
                    id="transaction-id"
                    placeholder="Enter UPI transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    placeholder="Any additional payment details..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Important:</p>
                      <p className="text-yellow-700 mt-1">
                        After making the payment, enter the transaction ID from your UPI app to confirm the payment.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {paymentMethod !== 'razorpay' && (
            <Button
              onClick={handlePaymentConfirmation}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}