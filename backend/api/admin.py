from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import (User, Room, Device, Action, Stat,
                     Category, Service, DeletionRequest, WhitelistEntry)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "level", "points",
                    "is_approved", "email_verified")
    list_filter = ("level", "role", "is_approved", "email_verified")
    fieldsets = UserAdmin.fieldsets + (
        ("Profil maison", {"fields": (
            "age", "role", "gender", "date_naissance", "photo",
            "level", "points", "nb_connexions", "nb_actions",
            "is_approved", "email_verified",
        )}),
    )


admin.site.register(Room)
admin.site.register(Category)
admin.site.register(Service)
admin.site.register(Device)
admin.site.register(Action)
admin.site.register(Stat)


@admin.register(WhitelistEntry)
class WhitelistAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "require_email_verification", "added_at")
    list_filter = ("role", "require_email_verification")
    search_fields = ("email",)


@admin.register(DeletionRequest)
class DeletionRequestAdmin(admin.ModelAdmin):
    list_display = ("device", "requested_by", "status", "created_at")
    list_filter = ("status",)
    actions = ["approve_and_delete", "reject"]

    @admin.action(description="Approuver et supprimer les objets")
    def approve_and_delete(self, request, queryset):
        for dr in queryset.filter(status="pending"):
            dr.device.delete()
            dr.status = "approved"
            dr.resolved_at = timezone.now()
            dr.save()

    @admin.action(description="Refuser les demandes")
    def reject(self, request, queryset):
        queryset.filter(status="pending").update(
            status="rejected", resolved_at=timezone.now())
