// The base URL for the API, configured via environment variables for flexibility.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// --- API Response Interfaces ---
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "principal" | "teacher" | "student";
  profile?: {
    phone?: string;
    address?: string;
    class_name?: string;
    subject?: string;
  };
}
export interface AuthTokens {
  access: string;
  refresh: string;
}

// --- API Client Class ---
class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("access_token");
    }
  }

  private setTokens(access: string, refresh: string) {
    this.accessToken = access;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  public clearTokens() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    const fetchOptions: RequestInit = { ...options, headers, cache: 'no-store' };
    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else if (response.ok) {
        // Handle non-JSON success responses (like HTML for reports)
        return { success: true, data: await response.text() as any };
      }

      if (!response.ok) {
        const isRefreshing = endpoint.includes("/auth/token/refresh/");
        if (response.status === 401 && this.accessToken && !isRefreshing) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.request(endpoint, options);
          } else {
            this.clearTokens();
            return { success: false, message: "Your session has expired. Please login again." };
          }
        }
        return { success: false, message: data?.detail || data?.message || `HTTP Error: ${response.status}`, errors: data?.errors || {} };
      }
      return { success: true, data };
    } catch (error) {
      console.error("API request failed:", error);
      return { success: false, message: error instanceof Error ? error.message : "A network error occurred." };
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    const response = await this.request<{ access: string }>("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (response.success && response.data?.access) {
      this.setAccessToken(response.data.access);
      return true;
    }
    return false;
  }

  async login(username: string, password: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    type LoginResponse = { access: string; refresh: string; user: User };
    const response = await this.request<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (response.success && response.data) {
      const { access, refresh, user } = response.data;
      this.setTokens(access, refresh);
      return { success: true, data: { user, tokens: { access, refresh } } };
    }
    return response as unknown as ApiResponse<{ user: User; tokens: AuthTokens }>;
  }

  async logout(): Promise<ApiResponse> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
        await this.request("/auth/logout/", {
            method: "POST",
            body: JSON.stringify({ refresh: refreshToken }),
        });
    }
    this.clearTokens();
    return { success: true, message: "Logged out successfully" };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> { return this.request<User>("/auth/user/"); }
  async get<T>(endpoint: string): Promise<ApiResponse<T>> { return this.request<T>(endpoint); }
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> { return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(data) }); }
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> { return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }); }
  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> { return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }); }
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> { return this.request<T>(endpoint, { method: "DELETE" }); }
}

// --- Singleton Instance and Helper Object ---
export const apiClient = new ApiClient(API_BASE_URL);

export const api = {
  admin: {
    updateUser: (userId: number, data: { username?: string; password?: string }) =>
      apiClient.post("/admin/update-user/", {
        user_id: userId,
        username: data.username,
        password: data.password,
      }),
  },
  users: {
    list: () => apiClient.get("/users/"),
  },
  auth: {
    login: (username: string, password: string) => apiClient.login(username, password),
    logout: () => apiClient.logout(),
    getCurrentUser: () => apiClient.getCurrentUser(),
    passwordReset: (identifier: string) => apiClient.post('/auth/password-reset/', { identifier }),
    passwordResetConfirm: (token: string, newPassword: string) =>
      apiClient.post('/auth/password-reset-confirm/', { token, new_password: newPassword }),
  },
  students: {
    list: () => apiClient.get("/students/"),
    get: (id: number) => apiClient.get(`/students/${id}/`),
    create: (data: any) => apiClient.post("/students/", data),
    update: (id: number, data: any) => apiClient.put(`/students/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/students/${id}/`),
    fees: (id: number) => apiClient.get(`/students/${id}/fees/`),
    attendance: (id: number) => apiClient.get(`/students/${id}/attendance/`),
    details: (id: number) => apiClient.get(`/student/${id}/details/`),
  },
  teachers: {
    list: () => apiClient.get("/teachers/"),
    get: (id: number) => apiClient.get(`/teachers/${id}/`),
    create: (data: any) => apiClient.post("/teachers/", data),
    update: (id: number, data: any) => apiClient.put(`/teachers/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/teachers/${id}/`),
    classes: (id: number) => apiClient.get(`/teachers/${id}/classes/`),
    students: (id: number) => apiClient.get(`/teachers/${id}/students/`),
  },
  classes: {
    list: () => apiClient.get("/classes/"),
    get: (id: number) => apiClient.get(`/classes/${id}/`),
    create: (data: any) => apiClient.post("/classes/", data),
    update: (id: number, data: any) => apiClient.put(`/classes/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/classes/${id}/`),
    students: (id: number) => apiClient.get(`/classes/${id}/students/`),
    timetable: (id: number) => apiClient.get(`/classes/${id}/timetable/`),
    details: (id: number) => apiClient.get(`/classes/${id}/details/`),
  },
  fees: {
    list: () => apiClient.get("/fees/"),
    createFee: (studentId: number, amount: number, dueDate: string) => 
      apiClient.post("/fees/actions/", { action: "create_fee", student_id: studentId, amount, due_date: dueDate }),
    createClassFee: (classId: number, amount: number, dueDate: string) =>
      apiClient.post("/fees/actions/", { action: "create_class_fee", class_id: classId, amount, due_date: dueDate }),
    sendReminders: () => 
      apiClient.post("/fees/actions/", { action: "send_reminders" }),
    delete: (id: number) => apiClient.delete(`/fees/${id}/`),
  },
  feeTypes: {
    list: () => apiClient.get("/fee-types/"),
    update: (id: number, data: { amount: number }) => apiClient.patch(`/fee-types/${id}/`, data),
  },
  attendance: {
    list: () => apiClient.get("/attendance/"),
    create: (data: any) => apiClient.post("/attendance/", data),
    update: (id: number, data: any) => apiClient.put(`/attendance/${id}/`, data),
    byClass: (classId: number, date?: string) =>
      apiClient.get(`/attendance/class/${classId}/${date ? `?date=${date}` : ""}`),
  },
  timetable: {
    list: () => apiClient.get("/timetable/"),
    get: (id: number) => apiClient.get(`/timetable/${id}/`),
    create: (data: any) => apiClient.post("/timetable/", data),
    update: (id: number, data: any) => apiClient.put(`/timetable/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/timetable/${id}/`),
    byClass: (classId: number) => apiClient.get(`/timetable/class/${classId}/`),
  },
  leaves: {
    list: () => apiClient.get("/leaves/"),
    get: (id: number) => apiClient.get(`/leaves/${id}/`),
    create: (data: any) => apiClient.post("/leaves/", data),
    update: (id: number, data: any) => apiClient.put(`/leaves/${id}/`, data),
    approve: (id: number) => apiClient.patch(`/leaves/${id}/`, { status: "approved" }),
    reject: (id: number) => apiClient.patch(`/leaves/${id}/`, { status: "rejected" }),
  },
  reports: {
    list: () => apiClient.get("/report-management/list_reports/"),
    generate: (data: { report_type: string; format?: string }) =>
      apiClient.post("/report-management/generate/", { ...data, format: data.format || 'pdf' }),
    files: (reportId: string) => apiClient.get(`/report-management/${reportId}/files/`),
    download: (reportId: string, params: { path: string }) =>
      apiClient.get(`/report-management/${reportId}/download/?path=${encodeURIComponent(params.path)}`),
    delete: (reportId: string) => apiClient.delete(`/report-management/${reportId}/delete/`),
  },
  health: {
    check: () => apiClient.get("/health/"),
  },
  config: {
    getSchoolConfig: () => apiClient.get("/config/"),
  },
    tasks: {
      list: () => apiClient.get("/tasks/"),
      create: (data: any) => apiClient.post("/tasks/", data),
      update: (id: number, data: any) => apiClient.put(`/tasks/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/tasks/${id}/`),
      markCompleted: (id: number) => apiClient.post(`/tasks/${id}/mark_completed/`, {}),
      markInProgress: (id: number) => apiClient.post(`/tasks/${id}/mark_in_progress/`, {}),
      todayTasks: () => apiClient.get("/tasks/today_tasks/"),
      upcomingTasks: () => apiClient.get("/tasks/upcoming_tasks/"),
    },
    // Fee Structures
    feeStructures: {
      list: () => apiClient.get("/fee-structures/"),
      create: (data: any) => apiClient.post("/fee-structures/", data),
      get: (id: number) => apiClient.get(`/fee-structures/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/fee-structures/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/fee-structures/${id}/`),
    },
    // Payments
    payments: {
      list: () => apiClient.get("/payments/"),
      create: (data: any) => apiClient.post("/payments/", data),
      get: (id: number) => apiClient.get(`/payments/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/payments/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/payments/${id}/`),
      updateStatus: (id: number, status: string) => apiClient.post(`/payments/${id}/update_status/`, { status }),
      processRefund: (id: number, amount: number, reason: string) => apiClient.post(`/payments/${id}/process_refund/`, { amount, reason }),
      process: (data: any) => apiClient.post("/payments/process/", data),
    },
    // Discounts
    discounts: {
      list: () => apiClient.get("/discounts/"),
      create: (data: any) => apiClient.post("/discounts/", data),
      get: (id: number) => apiClient.get(`/discounts/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/discounts/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/discounts/${id}/`),
    },
    // Refunds
    refunds: {
      list: () => apiClient.get("/refunds/"),
      create: (data: any) => apiClient.post("/refunds/", data),
      get: (id: number) => apiClient.get(`/refunds/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/refunds/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/refunds/${id}/`),
    },
    // Payment Plans
    paymentPlans: {
      list: () => apiClient.get("/payment-plans/"),
      create: (data: any) => apiClient.post("/payment-plans/", data),
      get: (id: number) => apiClient.get(`/payment-plans/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/payment-plans/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/payment-plans/${id}/`),
    },
    // Fee Reports
    feeReports: {
      list: () => apiClient.get("/fee-reports/"),
      create: (data: any) => apiClient.post("/fee-reports/", data),
      get: (id: number) => apiClient.get(`/fee-reports/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/fee-reports/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/fee-reports/${id}/`),
    },
    // Fee Analytics
    feeAnalytics: {
      studentFeesSummary: () => apiClient.get("/fee-analytics/student_fees_summary/"),
      outstandingBalances: () => apiClient.get("/fee-analytics/outstanding_balances/"),
      paymentHistory: () => apiClient.get("/fee-analytics/payment_history/"),
      revenueAnalytics: () => apiClient.get("/fee-analytics/revenue_analytics/"),
    },
    // Fee Reports Generation
    feeReportsGen: {
      overdueFees: () => apiClient.get("/fee-reports-gen/overdue_fees/"),
      feeCollectionTrends: () => apiClient.get("/fee-reports-gen/fee_collection_trends/"),
      studentPerformance: () => apiClient.get("/fee-reports-gen/student_performance/"),
    },
    // Assignments
    assignments: {
      list: () => apiClient.get("/assignments/"),
      create: (data: any) => apiClient.post("/assignments/", data),
      get: (id: number) => apiClient.get(`/assignments/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/assignments/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/assignments/${id}/`),
      submissions: (id: number) => apiClient.get(`/assignments/${id}/submissions/`),
      byClass: (classId: number) => apiClient.get(`/assignments/by_class/?class_id=${classId}`),
    },
    // Assignment Submissions
    assignmentSubmissions: {
      list: () => apiClient.get("/assignment-submissions/"),
      create: (data: any) => apiClient.post("/assignment-submissions/", data),
      get: (id: number) => apiClient.get(`/assignment-submissions/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/assignment-submissions/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/assignment-submissions/${id}/`),
      grade: (id: number, grade: number, feedback?: string) => apiClient.post(`/assignment-submissions/${id}/grade/`, { grade, feedback }),
    },
    // Reimbursements
    reimbursements: {
      list: () => apiClient.get("/reimbursements/"),
      create: (data: any) => apiClient.post("/reimbursements/", data),
      get: (id: number) => apiClient.get(`/reimbursements/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/reimbursements/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/reimbursements/${id}/`),
      approve: (id: number) => apiClient.post(`/reimbursements/${id}/approve/`, {}),
      reject: (id: number) => apiClient.post(`/reimbursements/${id}/reject/`, {}),
      markPaid: (id: number) => apiClient.post(`/reimbursements/${id}/mark_paid/`, {}),
    },
    // Reimbursement Types
    reimbursementTypes: {
      list: () => apiClient.get("/reimbursement-types/"),
      create: (data: any) => apiClient.post("/reimbursement-types/", data),
      get: (id: number) => apiClient.get(`/reimbursement-types/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/reimbursement-types/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/reimbursement-types/${id}/`),
    },
    // School
    school: {
      list: () => apiClient.get("/school/"),
      create: (data: any) => apiClient.post("/school/", data),
      get: (id: number) => apiClient.get(`/school/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/school/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/school/${id}/`),
    },
    // School Settings
    schoolSettings: {
      list: () => apiClient.get("/school-settings/"),
      create: (data: any) => apiClient.post("/school-settings/", data),
      get: (id: number) => apiClient.get(`/school-settings/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/school-settings/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/school-settings/${id}/`),
    },
    // Periods
    periods: {
      list: () => apiClient.get("/periods/"),
      create: (data: any) => apiClient.post("/periods/", data),
      get: (id: number) => apiClient.get(`/periods/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/periods/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/periods/${id}/`),
    },
    // Grades
    grades: {
      list: () => apiClient.get("/grades/"),
      create: (data: any) => apiClient.post("/grades/", data),
      get: (id: number) => apiClient.get(`/grades/${id}/`),
      update: (id: number, data: any) => apiClient.put(`/grades/${id}/`, data),
      delete: (id: number) => apiClient.delete(`/grades/${id}/`),
    },
    // Notifications
    notifications: {
      list: () => apiClient.get("/notifications/"),
      markRead: (id: number) => apiClient.patch(`/notifications/${id}/`, { is_read: true }),
    },
    // Async Tasks
    asyncTasks: {
      processBulkData: (data: any) => apiClient.post("/async-tasks/process_bulk_data/", data),
      generateReportAsync: (data: any) => apiClient.post("/async-tasks/generate_report_async/", data),
    },
    // Database Management
    database: {
      snapshot: () => apiClient.get("/snapshot/"),
      createSnapshot: (data: any) => apiClient.post("/snapshot/", data),
    },
    // Fee Actions (bulk operations)
    feeActions: {
      createClassFee: (classId: number, amount: number, dueDate: string) =>
        apiClient.post("/fees/actions/", { action: "create_class_fee", class_id: classId, amount, due_date: dueDate }),
      sendReminders: () => apiClient.post("/fees/actions/", { action: "send_reminders" }),
      generateReport: () => apiClient.get("/fees/actions/"),
    }
};