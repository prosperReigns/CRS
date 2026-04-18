from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import StaffResponsibility, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role", "phone", "staff_responsibilities")}),)
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    filter_horizontal = ("staff_responsibilities",)


@admin.register(StaffResponsibility)
class StaffResponsibilityAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")
