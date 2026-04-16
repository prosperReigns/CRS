from django.http import JsonResponse


class FrozenUserRestrictionMiddleware:
    ALLOWED_PATHS = {
        "/api/auth/login/",
        "/api/auth/refresh/",
        "/api/accounts/auth/login/",
        "/api/accounts/auth/refresh/",
        "/api/accounts/users/me/",
    }
    REPORT_SUBMISSION_PATH = "/api/reports/reports/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        path = request.path

        if (
            path.startswith("/api/")
            and user
            and user.is_authenticated
            and getattr(user, "is_frozen", False)
            and request.method not in {"GET", "HEAD", "OPTIONS"}
            and path not in self.ALLOWED_PATHS
            and not (path == self.REPORT_SUBMISSION_PATH and request.method == "POST")
        ):
            return JsonResponse(
                {
                    "detail": "Your account is temporarily restricted. Please submit your pending report.",
                    "is_frozen": True,
                },
                status=423,
            )

        return self.get_response(request)
