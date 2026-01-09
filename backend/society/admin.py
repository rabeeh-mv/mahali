from django.contrib import admin
from .models import Area, House, Member, Collection, SubCollection, MemberObligation, AppSettings

# Register your models here.
admin.site.register(Area)
admin.site.register(House)
admin.site.register(Member)
admin.site.register(Collection)
admin.site.register(SubCollection)
admin.site.register(MemberObligation)
admin.site.register(AppSettings)

from .models import RecentAction

@admin.register(RecentAction)
class RecentActionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'action_type', 'model_name', 'description', 'is_sync_pending')
    list_filter = ('action_type', 'model_name', 'is_sync_pending', 'timestamp')
    search_fields = ('description', 'object_id')
    readonly_fields = ('timestamp', 'action_type', 'model_name', 'object_id', 'description', 'fields_changed')
