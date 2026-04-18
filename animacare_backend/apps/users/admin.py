from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, VeterinarianProfile, ShelterAdminProfile, CivicAuthorityProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ('username', 'email', 'get_full_name', 'role', 'account_status', 'date_joined')
    list_filter   = ('role', 'account_status', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering      = ('-date_joined',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('AnimaCare Profile', {
            'fields': ('role', 'account_status', 'phone_number', 'address',
                       'profile_picture', 'requires_approval', 'approval_note',
                       'approved_by', 'approved_at'),
        }),
    )


@admin.register(VeterinarianProfile)
class VeterinarianProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'clinic_hospital_name', 'medical_license_number', 'specialization')
    search_fields = ('user__username', 'medical_license_number', 'clinic_hospital_name')


@admin.register(ShelterAdminProfile)
class ShelterAdminProfileAdmin(admin.ModelAdmin):
    list_display  = ('shelter_name', 'user', 'shelter_registration_number', 'capacity')
    search_fields = ('shelter_name', 'shelter_registration_number', 'user__username')


@admin.register(CivicAuthorityProfile)
class CivicAuthorityProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'department_name', 'employee_id', 'jurisdiction_area')
    search_fields = ('user__username', 'department_name', 'employee_id')
