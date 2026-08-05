from django.conf import settings
from django.core.exceptions import ValidationError


def validate_pdf_file(file):
    content_type = getattr(file, "content_type", None)
    if content_type and content_type != "application/pdf":
        raise ValidationError("Only PDF files are accepted.")

    name = getattr(file, "name", "") or ""
    if not name.lower().endswith(".pdf"):
        raise ValidationError("Only PDF files are accepted.")

    max_bytes = getattr(settings, "MAX_INVOICE_UPLOAD_SIZE_MB", 10) * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError(f"File too large — max {settings.MAX_INVOICE_UPLOAD_SIZE_MB} MB.")
