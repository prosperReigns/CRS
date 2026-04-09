from django.contrib import admin

from .models import CellReport, ReportActivityLog, ReportComment, ReportImage

admin.site.register(CellReport)
admin.site.register(ReportImage)
admin.site.register(ReportComment)
admin.site.register(ReportActivityLog)
