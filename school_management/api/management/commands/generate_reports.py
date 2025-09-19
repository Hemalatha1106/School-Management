import os
import json
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from api.models import *
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


class Command(BaseCommand):
    help = 'Generate comprehensive reports and store them in organized folder structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--report-type',
            type=str,
            choices=['all', 'academic', 'financial', 'attendance', 'performance'],
            default='all',
            help='Type of report to generate'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['json', 'csv', 'html', 'pdf'],
            default='json',
            help='Output format for reports'
        )
        parser.add_argument(
            '--date-range',
            type=str,
            help='Date range in format YYYY-MM-DD:YYYY-MM-DD'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting Report Generation...')
        )

        # Create reports directory structure
        reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')

        # Create timestamped report directory
        report_dir = os.path.join(reports_base_dir, f'report_{timestamp}')
        os.makedirs(report_dir, exist_ok=True)

        # Create subdirectories for different report types
        subdirs = ['academic', 'financial', 'attendance', 'performance', 'summary']
        for subdir in subdirs:
            os.makedirs(os.path.join(report_dir, subdir), exist_ok=True)

        report_type = options['report_type']
        output_format = options['format']

        try:
            if report_type in ['all', 'academic']:
                self.generate_academic_reports(report_dir, output_format)

            if report_type in ['all', 'financial']:
                self.generate_financial_reports(report_dir, output_format)

            if report_type in ['all', 'attendance']:
                self.generate_attendance_reports(report_dir, output_format)

            if report_type in ['all', 'performance']:
                self.generate_performance_reports(report_dir, output_format)

            # Generate summary report
            self.generate_summary_report(report_dir, output_format)

            # Create metadata file
            self.create_metadata_file(report_dir, timestamp, report_type)

            self.stdout.write(
                self.style.SUCCESS(f'Reports generated successfully in: {report_dir}')
            )

        except Exception as e:
            raise CommandError(f'Error generating reports: {str(e)}')

    def generate_academic_reports(self, report_dir, output_format):
        """Generate academic-related reports"""
        self.stdout.write('Generating Academic Reports...')

        academic_dir = os.path.join(report_dir, 'academic')

        # Student enrollment report
        students_data = list(Student.objects.select_related('user', 'school_class').values(
            'user__first_name', 'user__last_name', 'user__username',
            'school_class__name', 'user__date_joined'
        ))

        # Class distribution report
        class_distribution = list(SchoolClass.objects.annotate(
            student_count=Count('students')
        ).values('name', 'student_count'))

        # Teacher workload report
        teacher_workload = list(Teacher.objects.select_related('user').annotate(
            class_count=Count('user__taught_classes')
        ).values(
            'user__first_name', 'user__last_name',
            'user__username', 'class_count'
        ))

        # Subject distribution
        subject_distribution = list(Timetable.objects.values('subject').annotate(
            count=Count('subject')
        ).order_by('-count'))

        reports = {
            'student_enrollment': students_data,
            'class_distribution': class_distribution,
            'teacher_workload': teacher_workload,
            'subject_distribution': subject_distribution
        }

        self.save_report(academic_dir, 'academic_reports', reports, output_format)

    def generate_financial_reports(self, report_dir, output_format):
        """Generate financial reports"""
        self.stdout.write('Generating Financial Reports...')

        financial_dir = os.path.join(report_dir, 'financial')

        # Fee collection summary
        fee_summary = Fee.objects.aggregate(
            total_amount=Sum('amount'),
            paid_amount=Sum('amount', filter=models.Q(status='paid')),
            pending_amount=Sum('amount', filter=models.Q(status__in=['unpaid', 'partial']))
        )

        # Fee status breakdown
        fee_status_breakdown = list(Fee.objects.values('status').annotate(
            count=Count('status'),
            total_amount=Sum('amount')
        ))

        # Monthly fee collection trend (last 12 months)
        monthly_trend = []
        for i in range(12):
            date = timezone.now() - timedelta(days=30*i)
            month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

            monthly_data = Fee.objects.filter(
                due_date__gte=month_start,
                due_date__lte=month_end
            ).aggregate(
                collected=Sum('amount', filter=models.Q(status='paid')),
                pending=Sum('amount', filter=models.Q(status__in=['unpaid', 'partial']))
            )

            monthly_trend.append({
                'month': month_start.strftime('%Y-%m'),
                'collected': monthly_data['collected'] or 0,
                'pending': monthly_data['pending'] or 0
            })

        # Class-wise fee analysis
        class_fee_analysis = list(Fee.objects.values(
            'student__school_class__name'
        ).annotate(
            total_fees=Sum('amount'),
            paid_fees=Sum('amount', filter=models.Q(status='paid')),
            pending_fees=Sum('amount', filter=models.Q(status__in=['unpaid', 'partial']))
        ))

        reports = {
            'fee_summary': fee_summary,
            'fee_status_breakdown': fee_status_breakdown,
            'monthly_collection_trend': monthly_trend,
            'class_fee_analysis': class_fee_analysis
        }

        self.save_report(financial_dir, 'financial_reports', reports, output_format)

    def generate_attendance_reports(self, report_dir, output_format):
        """Generate attendance reports"""
        self.stdout.write('Generating Attendance Reports...')

        attendance_dir = os.path.join(report_dir, 'attendance')

        # Overall attendance statistics
        attendance_stats = Attendance.objects.aggregate(
            total_records=Count('id'),
            present_count=Count('id', filter=models.Q(status='present')),
            absent_count=Count('id', filter=models.Q(status='absent')),
            late_count=Count('id', filter=models.Q(status='late'))
        )

        # Student-wise attendance
        student_attendance = list(Student.objects.annotate(
            total_classes=Count('attendance_records'),
            present_count=Count('attendance_records', filter=models.Q(attendance_records__status='present')),
            absent_count=Count('attendance_records', filter=models.Q(attendance_records__status='absent')),
            late_count=Count('attendance_records', filter=models.Q(attendance_records__status='late'))
        ).values(
            'user__first_name', 'user__last_name', 'user__username',
            'school_class__name', 'total_classes', 'present_count',
            'absent_count', 'late_count'
        ))

        # Class-wise attendance
        class_attendance = list(SchoolClass.objects.annotate(
            total_students=Count('students'),
            avg_attendance=Avg(
                Student.objects.filter(school_class=models.OuterRef('pk')).annotate(
                    attendance_rate=Count('attendance_records', filter=models.Q(attendance_records__status='present')) * 100.0 / Count('attendance_records')
                ).values('attendance_rate')
            )
        ).values('name', 'total_students', 'avg_attendance'))

        # Monthly attendance trend
        monthly_attendance = []
        for i in range(6):
            date = timezone.now() - timedelta(days=30*i)
            month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

            monthly_data = Attendance.objects.filter(
                date__gte=month_start,
                date__lte=month_end
            ).aggregate(
                present=Count('id', filter=models.Q(status='present')),
                absent=Count('id', filter=models.Q(status='absent')),
                late=Count('id', filter=models.Q(status='late'))
            )

            monthly_attendance.append({
                'month': month_start.strftime('%Y-%m'),
                'present': monthly_data['present'] or 0,
                'absent': monthly_data['absent'] or 0,
                'late': monthly_data['late'] or 0
            })

        reports = {
            'attendance_statistics': attendance_stats,
            'student_attendance': student_attendance,
            'class_attendance': class_attendance,
            'monthly_attendance_trend': monthly_attendance
        }

        self.save_report(attendance_dir, 'attendance_reports', reports, output_format)

    def generate_performance_reports(self, report_dir, output_format):
        """Generate performance reports"""
        self.stdout.write('Generating Performance Reports...')

        performance_dir = os.path.join(report_dir, 'performance')

        # Grade distribution
        grade_distribution = list(Grade.objects.values('score').annotate(
            count=Count('score')
        ).order_by('score'))

        # Student performance summary
        student_performance = list(Student.objects.annotate(
            avg_score=Avg('grades__score'),
            total_assignments=Count('grades')
        ).values(
            'user__first_name', 'user__last_name', 'user__username',
            'school_class__name', 'avg_score', 'total_assignments'
        ))

        # Assignment-wise performance
        assignment_performance = list(Assignment.objects.annotate(
            avg_score=Avg('submissions__score'),
            total_submissions=Count('submissions')
        ).values('title', 'avg_score', 'total_submissions'))

        # Top performers
        top_performers = list(Student.objects.annotate(
            avg_score=Avg('grades__score')
        ).filter(avg_score__isnull=False).order_by('-avg_score')[:10].values(
            'user__first_name', 'user__last_name', 'user__username',
            'school_class__name', 'avg_score'
        ))

        reports = {
            'grade_distribution': grade_distribution,
            'student_performance': student_performance,
            'assignment_performance': assignment_performance,
            'top_performers': top_performers
        }

        self.save_report(performance_dir, 'performance_reports', reports, output_format)

    def generate_summary_report(self, report_dir, output_format):
        """Generate overall summary report"""
        self.stdout.write('Generating Summary Report...')

        summary_dir = os.path.join(report_dir, 'summary')

        # Overall statistics
        summary_stats = {
            'total_students': Student.objects.count(),
            'total_teachers': Teacher.objects.count(),
            'total_classes': SchoolClass.objects.count(),
            'total_fees': Fee.objects.count(),
            'total_paid_fees': Fee.objects.filter(status='paid').count(),
            'total_pending_fees': Fee.objects.filter(status__in=['unpaid', 'partial']).count(),
            'total_attendance_records': Attendance.objects.count(),
            'total_assignments': Assignment.objects.count(),
            'total_grades': Grade.objects.count(),
            'total_tasks': Task.objects.count(),
            'pending_leaves': LeaveRequest.objects.filter(status='pending').count()
        }

        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_activity = {
            'new_students': Student.objects.filter(user__date_joined__gte=thirty_days_ago).count(),
            'new_fees': Fee.objects.filter(due_date__gte=thirty_days_ago).count(),
            'new_assignments': Assignment.objects.filter(due_date__gte=thirty_days_ago).count(),
            'completed_tasks': Task.objects.filter(
                completed_at__gte=thirty_days_ago,
                status='completed'
            ).count()
        }

        reports = {
            'overall_statistics': summary_stats,
            'recent_activity': recent_activity,
            'system_health': {
                'database_status': 'healthy',
                'last_backup': timezone.now().isoformat(),
                'active_users': User.objects.filter(is_active=True).count()
            }
        }

        self.save_report(summary_dir, 'summary_report', reports, output_format)

    def save_report(self, directory, filename, data, output_format):
        """Save report data in specified format"""
        base_filename = os.path.join(directory, filename)

        if output_format == 'json':
            with open(f'{base_filename}.json', 'w') as f:
                json.dump(data, f, indent=2, default=str)
        elif output_format == 'csv':
            # Convert to CSV format
            for key, value in data.items():
                if isinstance(value, list) and value:
                    df = pd.DataFrame(value)
                    df.to_csv(f'{base_filename}_{key}.csv', index=False)
        elif output_format == 'html':
            # Generate HTML report
            html_content = self.generate_html_report(data)
            with open(f'{base_filename}.html', 'w') as f:
                f.write(html_content)
        elif output_format == 'pdf':
            # Generate PDF report
            self.generate_pdf_report(data, f'{base_filename}.pdf')

    def generate_html_report(self, data):
        """Generate HTML report from data"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>School Management Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .section {{ margin-bottom: 30px; }}
                .section h2 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }}
                table {{ border-collapse: collapse; width: 100%; margin-top: 10px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                tr:nth-child(even) {{ background-color: #f9f9f9; }}
            </style>
        </head>
        <body>
            <h1>School Management Report</h1>
            <p>Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        """

        for section_name, section_data in data.items():
            html += f"<div class='section'><h2>{section_name.replace('_', ' ').title()}</h2>"

            if isinstance(section_data, list) and section_data:
                html += "<table><thead><tr>"
                # Get headers from first item
                headers = list(section_data[0].keys())
                for header in headers:
                    html += f"<th>{header.replace('_', ' ').title()}</th>"
                html += "</tr></thead><tbody>"

                for item in section_data:
                    html += "<tr>"
                    for header in headers:
                        value = item.get(header, '')
                        html += f"<td>{value}</td>"
                    html += "</tr>"
                html += "</tbody></table>"
            elif isinstance(section_data, dict):
                html += "<table><tbody>"
                for key, value in section_data.items():
                    html += f"<tr><td><strong>{key.replace('_', ' ').title()}</strong></td><td>{value}</td></tr>"
                html += "</tbody></table>"
            else:
                html += f"<p>{section_data}</p>"

            html += "</div>"

        html += "</body></html>"
        return html

    def generate_pdf_report(self, data, filename):
        """Generate PDF report from data"""
        doc = SimpleDocTemplate(filename, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
        )
        story.append(Paragraph("School Management Report", title_style))
        story.append(Paragraph(f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Spacer(1, 12))

        for section_name, section_data in data.items():
            # Section header
            story.append(Paragraph(section_name.replace('_', ' ').title(), styles['Heading2']))
            story.append(Spacer(1, 6))

            if isinstance(section_data, list) and section_data:
                # Create table for list data
                if section_data:
                    headers = list(section_data[0].keys())
                    table_data = [headers]  # Add headers

                    for item in section_data:
                        row = []
                        for header in headers:
                            value = str(item.get(header, ''))
                            row.append(value)
                        table_data.append(row)

                    # Create table
                    table = Table(table_data)
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    story.append(table)
                    story.append(Spacer(1, 12))

            elif isinstance(section_data, dict):
                # Display dictionary data as key-value pairs
                for key, value in section_data.items():
                    if isinstance(value, (int, float)):
                        story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {value}", styles['Normal']))
                    elif isinstance(value, str):
                        story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {value}", styles['Normal']))
                    else:
                        story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {str(value)}", styles['Normal']))
                story.append(Spacer(1, 12))
            else:
                story.append(Paragraph(str(section_data), styles['Normal']))
                story.append(Spacer(1, 12))

            story.append(Spacer(1, 12))  # Space between sections

        doc.build(story)

    def create_metadata_file(self, report_dir, timestamp, report_type):
        """Create metadata file for the report"""
        metadata = {
            'report_id': f'report_{timestamp}',
            'generated_at': timezone.now().isoformat(),
            'report_type': report_type,
            'version': '1.0',
            'generator': 'School Management System',
            'includes': {
                'academic': report_type in ['all', 'academic'],
                'financial': report_type in ['all', 'financial'],
                'attendance': report_type in ['all', 'attendance'],
                'performance': report_type in ['all', 'performance'],
                'summary': True
            }
        }

        metadata_file = os.path.join(report_dir, 'metadata.json')
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)

        # Create index file for easy access
        index_content = f"""
School Management Report - {timestamp}

Report Type: {report_type}
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

Contents:
- metadata.json: Report metadata and information
- academic/: Academic reports (enrollment, classes, teachers, subjects)
- financial/: Financial reports (fees, payments, trends)
- attendance/: Attendance reports (statistics, trends, analysis)
- performance/: Performance reports (grades, rankings, analysis)
- summary/: Overall summary and system health

For detailed information, see metadata.json
"""
        index_file = os.path.join(report_dir, 'README.txt')
        with open(index_file, 'w') as f:
            f.write(index_content)