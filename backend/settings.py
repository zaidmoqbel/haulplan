import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "local-development-only-haulplan-change-before-hosting")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
ROOT_URLCONF = "urls"
INSTALLED_APPS = ["planner"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "django.middleware.csrf.CsrfViewMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.filebased.FileBasedCache", "LOCATION": BASE_DIR / ".cache", "TIMEOUT": 86400, "OPTIONS": {"MAX_ENTRIES": 2000}}}
DATA_UPLOAD_MAX_MEMORY_SIZE = 16384
CSRF_TRUSTED_ORIGINS = [s for s in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if s]
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
