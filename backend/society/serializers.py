from rest_framework import serializers
from .models import Member, Area, House, Collection, SubCollection, MemberObligation, Todo, AppSettings, DigitalRequest
from typing import Any


class AreaSerializer(serializers.ModelSerializer):
    total_houses = serializers.SerializerMethodField()
    total_live_members = serializers.SerializerMethodField()
    firebase_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Area
        fields = ['id', 'firebase_id', 'name', 'description', 'head_person', 'password', 'sync_pending', 'created_at', 'updated_at', 'total_houses', 'total_live_members']
    
    def get_total_houses(self, obj: Any) -> int:
        return obj.houses.count()
    
    def get_total_live_members(self, obj: Any) -> int:
        # Count only live members in this area
        return Member.objects.filter(house__area=obj, status='live').count()


class HouseSerializer(serializers.ModelSerializer):
    firebase_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
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
        fields = ['home_id', 'house_name', 'family_name', 'location_name', 'area_name', 'member_count', 'old_mahall_code']
    
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
        fields = ['home_id', 'house_name', 'family_name', 'location_name', 'area_name', 'old_mahall_code']

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
    firebase_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)

    def validate_photo(self, value):
        if value == '':
            return None
        return value

    house = SafeSlugRelatedField(
        queryset=House.objects.all(),
        slug_field='home_id',
        required=True
    )
    father = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False,
        allow_null=True
    )
    mother = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False,
        allow_null=True
    )
    married_to = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False,
        allow_null=True
    )
    second_spouse = SafeSlugRelatedField(
        queryset=Member.objects.all(),
        slug_field='member_id',
        required=False,
        allow_null=True
    )
    
    # Read-only nested details for frontend display
    house_details = HouseDetailSerializer(source='house', read_only=True)

    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ('member_id',)

    def validate(self, data):
        settings = AppSettings.objects.first()
        is_guardian = data.get('isGuardian', False)
        
        if self.instance:
            is_guardian = data.get('isGuardian', self.instance.isGuardian)
            
        if settings:
            # Rule 1: One Guardian per house
            if settings.rule_one_guardian_per_house and is_guardian:
                house = data.get('house')
                if self.instance and 'house' not in data:
                    house = self.instance.house
                if house:
                    existing_guardians = Member.objects.filter(house=house, isGuardian=True)
                    if self.instance:
                        existing_guardians = existing_guardians.exclude(pk=self.instance.pk)
                    if existing_guardians.exists():
                        raise serializers.ValidationError({"isGuardian": "This house already has a guardian. Only one guardian is allowed per house."})
            
            # Rule 3: Guardian needs aadhar, phone, dob
            if settings.rule_guardian_requires_details and is_guardian:
                adhar = data.get('adhar')
                phone = data.get('phone')
                dob = data.get('date_of_birth')
                
                if self.instance:
                    adhar = adhar if 'adhar' in data else self.instance.adhar
                    phone = phone if 'phone' in data else self.instance.phone
                    dob = dob if 'date_of_birth' in data else self.instance.date_of_birth
                
                if not adhar or not phone or not dob:
                    raise serializers.ValidationError("Guardian must have Aadhaar, Phone number, and Date of Birth.")

            # Rule 4: Track duplicate members using dob and phone
            if settings.rule_track_duplicate_members:
                phone = data.get('phone')
                dob = data.get('date_of_birth')
                
                if self.instance:
                    phone = phone if 'phone' in data else self.instance.phone
                    dob = dob if 'date_of_birth' in data else self.instance.date_of_birth
                
                if phone and dob:
                    duplicates = Member.objects.filter(phone=phone, date_of_birth=dob)
                    if self.instance:
                        duplicates = duplicates.exclude(pk=self.instance.pk)
                    if duplicates.exists():
                        raise serializers.ValidationError("A member with this Date of Birth and Phone number already exists.")

        return super().validate(data)


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

    def validate(self, data):
        settings = AppSettings.objects.first()
        if settings and settings.rule_no_duplicate_obligations:
            subcollection = data.get('subcollection')
            member = data.get('member')
            
            if self.instance:
                subcollection = subcollection if 'subcollection' in data else self.instance.subcollection
                member = member if 'member' in data else self.instance.member
                
            if subcollection and member:
                duplicates = MemberObligation.objects.filter(subcollection=subcollection, member=member)
                if self.instance:
                    duplicates = duplicates.exclude(pk=self.instance.pk)
                
                if duplicates.exists():
                    raise serializers.ValidationError("This member is already assigned to this obligation.")
                    
        return super().validate(data)


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


class DigitalRequestSerializer(serializers.ModelSerializer):
    firebase_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    class Meta:
        model = DigitalRequest
        fields = '__all__'
