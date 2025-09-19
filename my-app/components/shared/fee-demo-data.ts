// Sample data for fee management components
// This file contains all demo/sample data used in fee-related components

export interface SchoolFee {
  id: number
  class_id: number
  class_name: string
  fee_type: "tuition" | "exam" | "transport" | "lab" | "library" | "sports" | "other"
  name: string
  amount: string
  frequency: "monthly" | "quarterly" | "annually" | "one-time"
  due_date: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
  audit_trail: { timestamp: string, action: string, user_id: number }[]
}

export interface FeePayment {
  id: number
  student_id: number
  student_name: string
  class_name: string
  fee_id: number
  fee_name: string
  amount: number
  payment_date: string
  payment_method: "cash" | "online" | "bank_transfer" | "cheque"
  status: "paid" | "pending" | "overdue" | "partial"
  receipt_number: string
  collected_by: string
}

export interface FeeReport {
  total_fees: number
  collected_amount: number
  pending_amount: number
  overdue_amount: number
  collection_rate: number
  class_wise_breakdown: { class_name: string, collected: number, pending: number, rate: number }[]
  monthly_trend: { month: string, collected: number, target: number }[]
}

export interface TeacherFeeStructure {
  id: number
  name: string
  category: "Travel" | "Professional Development" | "Equipment" | "Conference" | "Other"
  fee_type: "fixed" | "percentage" | "tiered"
  amount: string
  max_amount?: string
  description: string
  requires_approval: boolean
  approval_levels: number
  approval_workflow: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  audit_trail: { timestamp: string, action: string, user_id: number }[]
}

export interface TeacherReimbursementClaim {
  id: number
  teacher_id: number
  teacher_name: string
  fee_structure_id: number
  category: string
  amount: number
  description: string
  receipts: string[]
  status: "pending" | "approved" | "rejected" | "paid"
  submitted_at: string
  approved_at?: string
  paid_at?: string
  approval_chain: { level: number, approver_id: number, status: string, timestamp: string }[]
  audit_logs: { timestamp: string, action: string, user_id: number, details: string }[]
}

// Sample data for school fees management
export const sampleSchoolFees: SchoolFee[] = [
  {
    id: 1,
    class_id: 1,
    class_name: "10-A",
    fee_type: "tuition",
    name: "Monthly Tuition Fee",
    amount: "2500",
    frequency: "monthly",
    due_date: "2024-09-01",
    description: "Regular monthly tuition fee for 10th grade",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  },
  {
    id: 2,
    class_id: 1,
    class_name: "10-A",
    fee_type: "exam",
    name: "Final Exam Fee",
    amount: "500",
    frequency: "annually",
    due_date: "2024-11-15",
    description: "Final examination fee for the academic year",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  },
  {
    id: 3,
    class_id: 2,
    class_name: "9-B",
    fee_type: "tuition",
    name: "Monthly Tuition Fee",
    amount: "2400",
    frequency: "monthly",
    due_date: "2024-09-01",
    description: "Regular monthly tuition fee for 9th grade",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  },
  {
    id: 4,
    class_id: 3,
    class_name: "8-A",
    fee_type: "transport",
    name: "School Bus Fee",
    amount: "800",
    frequency: "monthly",
    due_date: "2024-09-01",
    description: "Monthly transportation fee for school bus service",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  }
]

export const sampleClasses = [
  { id: 1, name: "10-A" },
  { id: 2, name: "9-B" },
  { id: 3, name: "8-A" },
  { id: 4, name: "7-B" }
]

export const sampleFeePayments: FeePayment[] = [
  {
    id: 1,
    student_id: 101,
    student_name: "Alice Johnson",
    class_name: "10-A",
    fee_id: 1,
    fee_name: "Monthly Tuition Fee",
    amount: 2500,
    payment_date: "2024-09-01",
    payment_method: "online",
    status: "paid",
    receipt_number: "RCP001",
    collected_by: "Principal"
  },
  {
    id: 2,
    student_id: 102,
    student_name: "Bob Smith",
    class_name: "10-A",
    fee_id: 1,
    fee_name: "Monthly Tuition Fee",
    amount: 2500,
    payment_date: "2024-09-02",
    payment_method: "cash",
    status: "paid",
    receipt_number: "RCP002",
    collected_by: "Principal"
  },
  {
    id: 3,
    student_id: 103,
    student_name: "Charlie Brown",
    class_name: "9-B",
    fee_id: 3,
    fee_name: "Monthly Tuition Fee",
    amount: 2400,
    payment_date: "2024-09-01",
    payment_method: "online",
    status: "pending",
    receipt_number: "RCP003",
    collected_by: "Principal"
  }
]

export const sampleFeeReport: FeeReport = {
  total_fees: 50000,
  collected_amount: 35000,
  pending_amount: 12000,
  overdue_amount: 3000,
  collection_rate: 70,
  class_wise_breakdown: [
    { class_name: "10-A", collected: 15000, pending: 3000, rate: 83 },
    { class_name: "9-B", collected: 12000, pending: 4000, rate: 75 },
    { class_name: "8-A", collected: 8000, pending: 5000, rate: 62 }
  ],
  monthly_trend: [
    { month: "Aug", collected: 8000, target: 10000 },
    { month: "Sep", collected: 12000, target: 12000 },
    { month: "Oct", collected: 15000, target: 14000 }
  ]
}

// Sample data for teacher fees structure
export const sampleTeacherFeeStructures: TeacherFeeStructure[] = [
  {
    id: 1,
    name: "Conference Attendance",
    category: "Conference",
    fee_type: "fixed",
    amount: "5000",
    max_amount: "10000",
    description: "Reimbursement for conference registration and travel",
    requires_approval: true,
    approval_levels: 2,
    approval_workflow: ["department_head", "principal"],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  },
  {
    id: 2,
    name: "Professional Development Course",
    category: "Professional Development",
    fee_type: "percentage",
    amount: "80",
    max_amount: "15000",
    description: "80% reimbursement for approved professional development courses",
    requires_approval: true,
    approval_levels: 1,
    approval_workflow: ["hr_manager"],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  },
  {
    id: 3,
    name: "Teaching Materials",
    category: "Equipment",
    fee_type: "fixed",
    amount: "2000",
    max_amount: "5000",
    description: "Reimbursement for classroom teaching materials and supplies",
    requires_approval: true,
    approval_levels: 1,
    approval_workflow: ["department_head"],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    audit_trail: []
  }
]

export const sampleTeacherReimbursementClaims: TeacherReimbursementClaim[] = [
  {
    id: 1,
    teacher_id: 1,
    teacher_name: "John Doe",
    fee_structure_id: 1,
    category: "Conference",
    amount: 7500,
    description: "International Mathematics Conference 2024",
    receipts: ["receipt1.pdf", "receipt2.pdf"],
    status: "pending",
    submitted_at: "2024-09-15T10:00:00Z",
    approval_chain: [
      { level: 1, approver_id: 2, status: "approved", timestamp: "2024-09-16T14:00:00Z" }
    ],
    audit_logs: [
      { timestamp: "2024-09-15T10:00:00Z", action: "submitted", user_id: 1, details: "Claim submitted for review" }
    ]
  },
  {
    id: 2,
    teacher_id: 2,
    teacher_name: "Sarah Miller",
    fee_structure_id: 2,
    category: "Professional Development",
    amount: 12000,
    description: "Advanced Teaching Methodology Workshop",
    receipts: ["workshop_receipt.pdf"],
    status: "approved",
    submitted_at: "2024-09-10T09:00:00Z",
    approved_at: "2024-09-12T11:00:00Z",
    approval_chain: [
      { level: 1, approver_id: 3, status: "approved", timestamp: "2024-09-12T11:00:00Z" }
    ],
    audit_logs: [
      { timestamp: "2024-09-10T09:00:00Z", action: "submitted", user_id: 2, details: "Claim submitted for review" },
      { timestamp: "2024-09-12T11:00:00Z", action: "approved", user_id: 3, details: "Claim approved by HR Manager" }
    ]
  },
  {
    id: 3,
    teacher_id: 3,
    teacher_name: "Robert Johnson",
    fee_structure_id: 3,
    category: "Equipment",
    amount: 3500,
    description: "Mathematics textbooks and workbooks for classroom",
    receipts: ["books_receipt.pdf"],
    status: "paid",
    submitted_at: "2024-09-08T14:00:00Z",
    approved_at: "2024-09-09T10:00:00Z",
    paid_at: "2024-09-10T16:00:00Z",
    approval_chain: [
      { level: 1, approver_id: 4, status: "approved", timestamp: "2024-09-09T10:00:00Z" }
    ],
    audit_logs: [
      { timestamp: "2024-09-08T14:00:00Z", action: "submitted", user_id: 3, details: "Claim submitted for review" },
      { timestamp: "2024-09-09T10:00:00Z", action: "approved", user_id: 4, details: "Claim approved by Department Head" },
      { timestamp: "2024-09-10T16:00:00Z", action: "paid", user_id: 5, details: "Payment processed" }
    ]
  }
]