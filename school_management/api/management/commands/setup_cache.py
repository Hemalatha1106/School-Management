import os
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from django.conf import settings


class Command(BaseCommand):
    help = 'Setup and test cache backends for optimal performance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--backend',
            type=str,
            choices=['locmem', 'redis', 'db'],
            default='locmem',
            help='Cache backend to use (locmem=local memory, redis=Redis, db=database)'
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Test the current cache backend'
        )
        parser.add_argument(
            '--enable-redis',
            action='store_true',
            help='Enable Redis cache if available'
        )

    def handle(self, *args, **options):
        if options['test']:
            self.test_cache()
            return

        if options['enable_redis']:
            self.enable_redis()
            return

        backend = options['backend']
        self.switch_backend(backend)

    def switch_backend(self, backend):
        """Switch the default cache backend"""
        current_backend = settings.CACHES['default']['BACKEND']

        if backend == 'locmem':
            new_backend = 'django.core.cache.backends.locmem.LocMemCache'
            location = 'school-management-cache'
        elif backend == 'redis':
            new_backend = 'django.core.cache.backends.redis.RedisCache'
            location = 'redis://127.0.0.1:6379/1'
        elif backend == 'db':
            new_backend = 'django.core.cache.backends.db.DatabaseCache'
            location = 'api_cache_table'
        else:
            raise CommandError(f'Unknown backend: {backend}')

        # Update settings
        settings.CACHES['default']['BACKEND'] = new_backend
        if 'LOCATION' in settings.CACHES['default']:
            settings.CACHES['default']['LOCATION'] = location

        self.stdout.write(
            self.style.SUCCESS(f'Switched cache backend to: {backend}')
        )

        # Test the new backend
        self.test_cache()

    def enable_redis(self):
        """Enable Redis if available"""
        try:
            import redis
            r = redis.Redis(host='127.0.0.1', port=6379, db=1)
            r.ping()
            self.stdout.write(
                self.style.SUCCESS('Redis is available! Enabling Redis cache...')
            )
            self.switch_backend('redis')
        except ImportError:
            raise CommandError('django-redis not installed. Run: pip install django-redis')
        except redis.ConnectionError:
            raise CommandError('Redis server not running. Please start Redis server first.')
        except Exception as e:
            raise CommandError(f'Redis connection failed: {e}')

    def test_cache(self):
        """Test the current cache backend"""
        try:
            # Test basic cache operations
            cache.set('test_key', 'test_value', 30)
            value = cache.get('test_key')
            if value == 'test_value':
                self.stdout.write(
                    self.style.SUCCESS('SUCCESS: Cache backend is working correctly')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('WARNING: Cache set/get test failed')
                )

            # Test cache deletion
            cache.delete('test_key')
            deleted_value = cache.get('test_key')
            if deleted_value is None:
                self.stdout.write(
                    self.style.SUCCESS('SUCCESS: Cache deletion working correctly')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('WARNING: Cache deletion test failed')
                )

            # Show current backend info
            backend_info = settings.CACHES['default']['BACKEND']
            self.stdout.write(f'Current cache backend: {backend_info}')

            if 'redis' in backend_info:
                self.stdout.write(
                    self.style.SUCCESS('Redis cache is active - Fast API responses enabled!')
                )
            elif 'locmem' in backend_info:
                self.stdout.write(
                    self.style.SUCCESS('Local memory cache is active - Good performance for development')
                )
            elif 'db' in backend_info:
                self.stdout.write(
                    self.style.SUCCESS('Database cache is active - Persistent but slower')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'ERROR: Cache test failed: {e}')
            )