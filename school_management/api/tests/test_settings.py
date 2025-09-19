"""
Test settings and configuration for fee management system tests.
This module provides test-specific settings and utilities.
"""

import os
from django.test.utils import get_runner
from django.conf import settings

# Test database configuration
TEST_DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Test-specific settings
TEST_SETTINGS = {
    'DEBUG': False,
    'SECRET_KEY': 'test-secret-key-for-fee-management-system',
    'DATABASES': TEST_DATABASES,
    'INSTALLED_APPS': [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'rest_framework_simplejwt',
        'api',
    ],
    'MIDDLEWARE': [
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'api.middleware.RequestLoggingMiddleware',
    ],
    'REST_FRAMEWORK': {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'rest_framework_simplejwt.authentication.JWTAuthentication',
            'rest_framework.authentication.SessionAuthentication',
        ],
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.IsAuthenticated',
        ],
        'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
        'PAGE_SIZE': 20,
        'DEFAULT_FILTER_BACKENDS': [
            'django_filters.rest_framework.DjangoFilterBackend',
            'rest_framework.filters.SearchFilter',
            'rest_framework.filters.OrderingFilter',
        ],
    },
    'SIMPLE_JWT': {
        'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
        'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
        'ROTATE_REFRESH_TOKENS': True,
        'BLACKLIST_AFTER_ROTATION': True,
    },
    'USE_TZ': True,
    'TIME_ZONE': 'Asia/Kolkata',
    'LANGUAGE_CODE': 'en-us',
    'USE_I18N': True,
    'USE_L10N': True,
    'STATIC_URL': '/static/',
    'STATIC_ROOT': os.path.join(settings.BASE_DIR, 'staticfiles'),
    'MEDIA_URL': '/media/',
    'MEDIA_ROOT': os.path.join(settings.BASE_DIR, 'media'),
    'TEMPLATES': [
        {
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [os.path.join(settings.BASE_DIR, 'api', 'templates')],
            'APP_DIRS': True,
            'OPTIONS': {
                'context_processors': [
                    'django.template.context_processors.debug',
                    'django.template.context_processors.request',
                    'django.contrib.auth.context_processors.auth',
                    'django.contrib.messages.context_processors.messages',
                ],
            },
        },
    ],
    'AUTH_USER_MODEL': 'api.User',
    'ROOT_URLCONF': 'api.urls',
    'WSGI_APPLICATION': 'school_management.wsgi.application',
    'DEFAULT_AUTO_FIELD': 'django.db.models.BigAutoField',
}

# Test runner configuration
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# Test isolation settings
TEST_ISOLATION = {
    'keepdb': False,  # Don't keep test database between runs
    'verbosity': 2,   # Verbose output
    'parallel': 1,    # Run tests sequentially for consistency
    'debug_mode': False,
}

# Coverage configuration
COVERAGE_SETTINGS = {
    'source': ['api'],
    'omit': [
        '*/tests/*',
        '*/migrations/*',
        '*/__pycache__/*',
        '*/venv/*',
        '*/env/*',
    ],
    'include': [
        'api/models.py',
        'api/serializers.py',
        'api/views.py',
        'api/forms.py',
    ],
    'report': {
        'exclude_lines': [
            'pragma: no cover',
            'def __repr__',
            'raise AssertionError',
            'raise NotImplementedError',
        ],
    },
}

# Performance testing settings
PERFORMANCE_TEST_SETTINGS = {
    'num_users': 100,
    'num_fees_per_user': 5,
    'concurrent_users': 10,
    'test_duration_seconds': 60,
}

# Load testing configuration
LOAD_TEST_SETTINGS = {
    'total_requests': 1000,
    'concurrent_requests': 50,
    'request_timeout': 30,
    'target_endpoints': [
        '/api/fees/',
        '/api/payments/',
        '/api/fee-analytics/student_fees_summary/',
    ],
}

def get_test_settings():
    """Get test-specific Django settings."""
    return TEST_SETTINGS

def get_coverage_config():
    """Get coverage configuration."""
    return COVERAGE_SETTINGS

def get_performance_config():
    """Get performance testing configuration."""
    return PERFORMANCE_TEST_SETTINGS

def get_load_test_config():
    """Get load testing configuration."""
    return LOAD_TEST_SETTINGS

def setup_test_environment():
    """Set up the test environment."""
    # Set Django settings for testing
    from django.conf import settings as django_settings
    for key, value in TEST_SETTINGS.items():
        setattr(django_settings, key, value)

    # Configure logging for tests
    import logging
    logging.basicConfig(
        level=logging.WARNING,  # Reduce log noise during tests
        format='%(levelname)s %(name)s %(message)s'
    )

    # Disable some middleware that might interfere with tests
    test_middleware = [
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    ]
    setattr(django_settings, 'MIDDLEWARE', test_middleware)

def teardown_test_environment():
    """Clean up the test environment."""
    # Reset any test-specific state
    from django.core.cache import cache
    cache.clear()

    # Close database connections
    from django.db import connections
    for connection in connections.all():
        connection.close()

def get_test_runner():
    """Get the test runner instance."""
    from django.test.utils import get_runner
    from django.conf import settings
    TestRunner = get_runner(settings)
    return TestRunner(**TEST_ISOLATION)