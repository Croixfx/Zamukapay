from rest_framework.response import Response


def api_response(data=None, message="", success=True, errors=None, status_code=200):
    """Builds a Response already in the standard envelope.

    Use this in plain APIViews that don't go through StandardResponseMixin
    (e.g. auth views), so every endpoint in the API returns the same shape.
    """
    return Response(
        {"success": success, "data": data, "message": message, "errors": errors},
        status=status_code,
    )
