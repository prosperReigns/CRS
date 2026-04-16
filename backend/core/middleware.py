from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    """
    Lightweight CORS middleware for API requests.
    Keeps local dev working even without third-party CORS packages.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")

        if self._is_preflight(request, origin):
            response = HttpResponse(status=200)
            return self._add_cors_headers(response, request, origin)

        response = self.get_response(request)
        if origin and self._origin_is_allowed(origin):
            response = self._add_cors_headers(response, request, origin)
        return response

    def _is_preflight(self, request, origin):
        return (
            request.method == "OPTIONS"
            and origin
            and request.headers.get("Access-Control-Request-Method")
            and self._origin_is_allowed(origin)
        )

    def _origin_is_allowed(self, origin):
        if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
            return True
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        return origin in allowed_origins

    def _add_cors_headers(self, response, request, origin):
        allow_origin = "*" if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False) else origin
        response["Access-Control-Allow-Origin"] = allow_origin
        response["Access-Control-Allow-Methods"] = ", ".join(
            getattr(settings, "CORS_ALLOW_METHODS", ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
        )
        response["Access-Control-Allow-Headers"] = ", ".join(
            getattr(settings, "CORS_ALLOW_HEADERS", ["Authorization", "Content-Type"])
        )
        response["Access-Control-Max-Age"] = str(getattr(settings, "CORS_MAX_AGE", 86400))

        vary = response.get("Vary")
        if vary:
            if "Origin" not in vary:
                response["Vary"] = f"{vary}, Origin"
        else:
            response["Vary"] = "Origin"

        return response
