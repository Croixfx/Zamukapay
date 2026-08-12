import dj_database_url

from .base import *  # noqa: F401,F403

DEBUG = False

SECRET_KEY = env("SECRET_KEY")

ALLOWED_HOSTS = [".onrender.com", ".koyeb.app", "localhost", "127.0.0.1"]

DATABASES = {
    "default": dj_database_url.config(
        default=env("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:8080"])

MIDDLEWARE = list(MIDDLEWARE)
MIDDLEWARE.insert(
    MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1,
    "whitenoise.middleware.WhiteNoiseMiddleware",
)

STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

REFRESH_TOKEN_COOKIE_SECURE = True
