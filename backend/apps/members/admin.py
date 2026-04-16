from django.contrib import admin

from .models import Attendance, ChurchService, MemberProfile, SoulWinning

admin.site.register(MemberProfile)
admin.site.register(SoulWinning)
admin.site.register(Attendance)
admin.site.register(ChurchService)
