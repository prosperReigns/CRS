from django.contrib import admin

from .models import Attendance, MemberProfile, SoulWinning

admin.site.register(MemberProfile)
admin.site.register(SoulWinning)
admin.site.register(Attendance)
