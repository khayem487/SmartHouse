from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r"devices", views.DeviceViewSet, basename="device")
router.register(r"rooms", views.RoomViewSet, basename="room")
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"services", views.ServiceViewSet, basename="service")
router.register(r"deletion-requests", views.DeletionRequestViewSet, basename="deletion")
router.register(r"admin/allowed-members", views.AllowedMemberViewSet, basename="allowed-member")

urlpatterns = [
    # AUTH
    path("register/", views.RegisterView.as_view()),
    path("login/", views.CustomTokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("change-password/", views.change_password),
    path("verify/<uuid:token>/", views.verify_email),
    path("verify-code/", views.verify_code),
    path("resend-verification/", views.resend_verification),

    # PROFILE
    path("profile/", views.ProfileView.as_view()),
    path("profile/set-level/", views.set_level),
    path("users/", views.list_users),
    path("admin/users/<int:user_id>/", views.admin_toggle_user),
    path("admin/users/<int:user_id>/delete/", views.admin_delete_user),

    # DEVICES / HISTORIQUE / STATS
    path("devices/<int:pk>/toggle/", views.toggle_device),
    path("actions/me/", views.my_actions),
    path("actions/history/", views.global_history),
    path("maintenance/", views.maintenance_devices),
    path("stats/summary/", views.stats_summary),
    path("stats/export/devices/", views.export_devices_csv),
    path("stats/export/consumption/", views.export_stats_csv),

    path("", include(router.urls)),
]
