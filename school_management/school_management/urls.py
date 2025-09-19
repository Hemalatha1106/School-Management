from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # This is the base for all our API endpoints, matching the client's config
    path('api/', include('api.urls')),
]