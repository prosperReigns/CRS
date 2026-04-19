from django.contrib import admin

from .models import (
    Attendance,
    CellMembership,
    ChurchService,
    FirstTimerEvent,
    MemberProfile,
    Person,
    SoulWinning,
    VisitationReport,
)

admin.site.register(MemberProfile)
admin.site.register(Person)
admin.site.register(CellMembership)
admin.site.register(SoulWinning)
admin.site.register(Attendance)
admin.site.register(ChurchService)
admin.site.register(VisitationReport)
admin.site.register(FirstTimerEvent)
