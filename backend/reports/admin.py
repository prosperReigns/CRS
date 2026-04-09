from django.contrib import admin
from .models import CellReport, ReportImage, ReportComment

admin.site.register(CellReport)
admin.site.register(ReportImage)
admin.site.register(ReportComment)