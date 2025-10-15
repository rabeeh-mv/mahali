from django.contrib import admin
from .models import Area, House, Member, Collection, SubCollection, MemberObligation

# Register your models here.
admin.site.register(Area)
admin.site.register(House)
admin.site.register(Member)
admin.site.register(Collection)
admin.site.register(SubCollection)
admin.site.register(MemberObligation)
