from rest_framework.response import Response


class StandardResponseMixin:
    """Wraps successful (2xx) responses in {success, data, message, errors}.

    Views can attach a custom message before returning by setting
    `response.standard_message = "..."`; otherwise it defaults to "".
    Error responses are wrapped by core.exceptions.standard_exception_handler
    instead, since DRF routes exceptions around finalize_response.
    """

    ENVELOPE_KEYS = {"success", "data", "message", "errors"}

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if isinstance(response, Response) and not response.exception:
            already_wrapped = isinstance(response.data, dict) and self.ENVELOPE_KEYS <= response.data.keys()
            if not already_wrapped:
                message = getattr(response, "standard_message", "")
                response.data = {
                    "success": True,
                    "data": response.data,
                    "message": message,
                    "errors": None,
                }
        return response
