from django.contrib import admin

from .models import BibleStudyClass, Cell, Fellowship

admin.site.register(Fellowship)
admin.site.register(Cell)
admin.site.register(BibleStudyClass)
