import logging
from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
import json

logger = logging.getLogger('django.security')

class RateLimitMiddleware:
    """Middleware for rate limiting API requests."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return self.get_response(request)

        # Skip rate limiting for certain paths
        exempt_paths = [
            '/admin/',
            '/static/',
            '/media/',
            '/health/',
        ]

        if any(request.path.startswith(path) for path in exempt_paths):
            return self.get_response(request)

        # Get client IP
        client_ip = self.get_client_ip(request)

        # Check rate limit
        is_allowed, remaining, reset_time = self.check_rate_limit(client_ip, request)

        if not is_allowed:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}, Path: {request.path}")
            response_data = {
                'error': 'Rate limit exceeded. Please try again later.',
                'remaining_attempts': remaining,
                'reset_time': reset_time,
                'retry_after': int((reset_time - timezone.now().timestamp()) / 60)  # minutes
            }
            response = HttpResponse(
                json.dumps(response_data),
                content_type='application/json',
                status=429
            )
            response['Retry-After'] = str(int((reset_time - timezone.now().timestamp())))
            return response

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def check_rate_limit(self, client_ip, request):
        """Check if request exceeds rate limit."""
        max_attempts = getattr(settings, 'RATE_LIMIT_REQUESTS', 100)
        window_seconds = getattr(settings, 'RATE_LIMIT_WINDOW', 900)

        cache_key = f"rate_limit_{client_ip}_{request.path}"
        current_time = timezone.now().timestamp()

        # Get existing attempts from cache
        attempts_data = cache.get(cache_key, {'count': 0, 'first_attempt': current_time})

        # Reset if window has passed
        if current_time - attempts_data['first_attempt'] > window_seconds:
            attempts_data = {'count': 0, 'first_attempt': current_time}

        # Check if limit exceeded
        if attempts_data['count'] >= max_attempts:
            reset_time = attempts_data['first_attempt'] + window_seconds
            return False, 0, reset_time

        # Increment attempts
        attempts_data['count'] += 1
        cache.set(cache_key, attempts_data, window_seconds)

        remaining_attempts = max_attempts - attempts_data['count']
        reset_time = attempts_data['first_attempt'] + window_seconds

        return True, remaining_attempts, reset_time


class SecurityHeadersMiddleware:
    """Middleware to add security headers to responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'

        # Only add HSTS in production (HTTPS)
        if request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        # Content Security Policy for fee management pages
        if 'fee' in request.path:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            )

        return response


class AuditLogMiddleware:
    """Middleware to log security-related events."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log sensitive operations
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if any(path in request.path for path in ['/fees/', '/payments/', '/refunds/']):
                user = request.user.username if request.user.is_authenticated else 'Anonymous'
                logger.info(f"AUDIT: {user} {request.method} {request.path} from {self.get_client_ip(request)}")

        response = self.get_response(request)

        # Log failed authentication attempts
        if response.status_code == 401:
            logger.warning(f"Unauthorized access attempt: {request.method} {request.path} from {self.get_client_ip(request)}")

        return response

    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CSRFProtectionMiddleware:
    """Enhanced CSRF protection middleware."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Additional CSRF checks for sensitive operations
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if 'fee' in request.path or 'payment' in request.path:
                # Check for CSRF token in headers for API requests
                if request.content_type and 'application/json' in request.content_type:
                    csrf_token = request.META.get('HTTP_X_CSRFTOKEN') or request.POST.get('csrfmiddlewaretoken')
                    if not csrf_token:
                        logger.warning(f"Missing CSRF token for {request.method} {request.path}")
                        # Note: Django's CSRF middleware will handle the actual rejection

        response = self.get_response(request)
        return response