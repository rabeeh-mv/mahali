from rest_framework import serializers
from .models import Member, Area, House, Collection, SubCollection, MemberObligation, Todo, AppSettings
from typing import Any


class AreaSerializer(serializers.ModelSerializer):
    total_houses = serializers.SerializerMethodField()
    total_live_members = serializers.SerializerMethodField()
    
    class Meta:
        model = Area
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'total_houses', 'total_live_members']
    
    def get_total_houses(self, obj: Any) -> int:
        return obj.houses.count()
    
    def get_total_live_members(self, obj: Any) -> int:
        # Count only live members in this area
        return Member.objects.filter(house__area=obj, status='live').count()


class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'
        read_only_fields = ('home_id',)


class HouseListSerializer(serializers.ModelSerializer):
    """Serializer for house listing that includes area name and member count"""
    area_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = House
        fields = ['home_id', 'house_name', 'family_name', 'location_name', 'area_name', 'member_count']
    
    def get_area_name(self, obj):
        try:
            return obj.area.name if obj.area else None
        except Exception:
            return None
            
    def get_member_count(self, obj):
        # Use the related manager to count members
        return obj.members.count()


class HouseDetailSerializer(serializers.ModelSerializer):
    area_name = serializers.SerializerMethodField()
    
    class Meta:
        model = House
        fields = ['home_id', 'house_name', 'family_name', 'location_name', 'area_name']

    def get_area_name(self, obj):
        try:
            return obj.area.name if obj.area else None
        except Exception:
            return None


class SafeSlugRelatedField(serializers.SlugRelatedField):
    """
    A SlugRelatedField that gracefully handles missing related objects (orphaned foreign keys).
    If the related object does not exist (DoesNotExist), it returns None instead of raising an error during serialization.
    """
    def to_representation(self, value):
        # In DRF, value is usually the related object instance.
        # But if the instance was retrieved via descriptor that failed, it might be an issue?
        # Actually, DRF calls get_attribute first.
        return super().to_representation(value)

    def get_attribute(self, instance):
        try:
            # This calls the property on the instance which might raise DoesNotExist
            return super().get_attribute(instance)
        except Exception:
            # If the relation is missing/broken, return None
            return None


class MemberSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False)
    house = SafeSlugRelatedField(
        queryset=House.objects.all(),
        slug_field='home_id',
        required=False
    )
    father = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False
    )
    mother = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False
    )
    married_to = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False
    )

    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ('member_id',)


class MemberDetailSerializer(serializers.ModelSerializer):
    """Serializer that includes full house details for member listing"""
    house = HouseDetailSerializer(read_only=True)
    
    class Meta:
        model = Member
        fields = '__all__'


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = '__all__'


class SubCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCollection
        fields = '__all__'


class MemberObligationSerializer(serializers.ModelSerializer):
    # Handle member ID properly - accept both string and integer
    member = serializers.SlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id'
    )
    # Handle subcollection ID properly
    subcollection = serializers.PrimaryKeyRelatedField(
        queryset=SubCollection.objects.all()
    )
    
    class Meta:
        model = MemberObligation
        fields = '__all__'


class MemberObligationDetailSerializer(serializers.ModelSerializer):
    """Serializer that includes full member details for listing"""
    
    class Meta:
        model = MemberObligation
        fields = '__all__'
        depth = 1


class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = '__all__'


class AppSettingsSerializer(serializers.ModelSerializer):
    firebase_config = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = AppSettings
        fields = '__all__'


from .models import RecentAction

class RecentActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecentAction
        fields = '__all__'

