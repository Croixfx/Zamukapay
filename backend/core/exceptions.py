from rest_framework.views import exception_handler as drf_exception_handler


def standard_exception_handler(exc, context):
    """Wraps every DRF error response in the project's standard envelope.

    Successful responses are wrapped separately by
    core.mixins.StandardResponseMixin.finalize_response — the two live apart
    because DRF only invokes this handler on the failure path.
    """
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    errors = response.data
    if isinstance(errors, dict) and "detail" in errors and len(errors) == 1:
        message = str(errors["detail"])
    elif isinstance(errors, dict):
        message = "Validation failed"
    elif isinstance(errors, list) and errors:
        message = str(errors[0])
    else:
        message = "Request failed"

    response.data = {
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }
    return response
