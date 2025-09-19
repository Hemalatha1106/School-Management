from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import StudentDashboardView, AdminUserUpdateView, StudentDetailView, DatabaseSnapshotView, ReportManagementViewSet, PaymentProcessingView, FeeActionsView, StudentFeesView # Import AdminUserUpdateView
from .views import student_fee_dashboard, admin_fee_dashboard, FeeListView, FeeDetailView, FeeCreateView, FeeUpdateView, PaymentCreateView, apply_discount, process_refund

router = DefaultRouter()
# --- REGISTER THE NEW UserViewSet ---
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'fee-types', views.FeeTypeViewSet, basename='feetype')
router.register(r'fee-structures', views.FeeStructureViewSet, basename='fee-structure')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'teachers', views.TeacherViewSet, basename='teacher')
router.register(r'classes', views.ClassViewSet, basename='class')
router.register(r'fees', views.FeeViewSet, basename='fee')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'discounts', views.DiscountViewSet, basename='discount')
router.register(r'refunds', views.RefundViewSet, basename='refund')
router.register(r'payment-plans', views.PaymentPlanViewSet, basename='payment-plan')
router.register(r'fee-reports', views.FeeReportViewSet, basename='fee-report')
router.register(r'fee-analytics', views.FeeAnalyticsViewSet, basename='fee-analytics')
router.register(r'fee-reports-gen', views.FeeReportsViewSet, basename='fee-reports-gen')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'timetable', views.TimetableViewSet, basename='timetable')
router.register(r'leaves', views.LeaveRequestViewSet, basename='leave')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'report-management', views.ReportManagementViewSet, basename='report-management')
router.register(r'async-tasks', views.AsyncTaskViewSet, basename='async-task')
router.register(r'periods', views.PeriodViewSet, basename='period')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'assignments', views.AssignmentViewSet, basename='assignment')
router.register(r'assignment-submissions', views.AssignmentSubmissionViewSet, basename='assignment-submission')
router.register(r'reimbursement-types', views.ReimbursementTypeViewSet, basename='reimbursement-type')
router.register(r'reimbursements', views.ReimbursementViewSet, basename='reimbursement')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'school', views.SchoolViewSet, basename='school')
router.register(r'school-settings', views.SchoolSettingViewSet, basename='school-setting')

# Dashboard stats endpoints
router.register(r'library-stats', views.LibraryStatsViewSet, basename='library-stats')
router.register(r'student-rank', views.StudentClassRankViewSet, basename='student-rank')
router.register(r'weekly-timetable', views.WeeklyTimetableViewSet, basename='weekly-timetable')
router.register(r'teacher-attendance-stats', views.TeacherAttendanceStatsViewSet, basename='teacher-attendance-stats')
router.register(r'teacher-assignment-stats', views.TeacherAssignmentStatsViewSet, basename='teacher-assignment-stats')
router.register(r'teacher-reimbursement-stats', views.TeacherReimbursementStatsViewSet, basename='teacher-reimbursement-stats')
router.register(r'teacher-grade-stats', views.TeacherGradeStatsViewSet, basename='teacher-grade-stats')

urlpatterns = [
    # --- ADD THE NEW PATH FOR CREDENTIAL CHANGE ---
    path('admin/update-user/', AdminUserUpdateView.as_view(), name='admin_update_user'),
    path('fees/actions/', FeeActionsView.as_view(), name='fee_actions'),
    path('payments/process/', PaymentProcessingView.as_view(), name='payment_process'),

    # Student-specific fee endpoints
    path('students/<int:student_id>/fees/', StudentFeesView.as_view(), name='student-fees'),

    # Report endpoints
    path('reports/overdue/', views.FeeReportsViewSet.as_view({'get': 'overdue_fees'}), name='overdue-fees-report'),
    path('reports/revenue/', views.FeeAnalyticsViewSet.as_view({'get': 'revenue_analytics'}), name='revenue-reports'),

    # ... (keep all other paths)
    path('health/', views.HealthCheckView.as_view(), name='health_check'),
    path('student/dashboard/', StudentDashboardView.as_view(), name='student_dashboard'),
    path('student/<int:student_id>/details/', StudentDetailView.as_view(), name='student_details'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth_logout'),
    path('auth/user/', views.CurrentUserView.as_view(), name='current_user'),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset-confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('config/', views.SchoolConfigView.as_view(), name='school_config'),
    path('snapshot/', DatabaseSnapshotView.as_view(), name='database_snapshot'),

    # Fee Management Web Interface URLs
    path('fees/dashboard/', student_fee_dashboard, name='fee_student_dashboard'),
    path('fees/admin/', admin_fee_dashboard, name='fee_admin_dashboard'),
    path('fees/', FeeListView.as_view(), name='fee_list'),
    path('fees/add/', FeeCreateView.as_view(), name='fee_add'),
    path('fees/<int:pk>/', FeeDetailView.as_view(), name='fee_detail'),
    path('fees/<int:pk>/edit/', FeeUpdateView.as_view(), name='fee_edit'),
    path('fees/<int:fee_id>/pay/', PaymentCreateView.as_view(), name='fee_pay'),
    path('fees/<int:fee_id>/discount/', apply_discount, name='fee_discount'),
    path('payments/<int:payment_id>/refund/', process_refund, name='payment_refund'),

    path('', include(router.urls)),
]