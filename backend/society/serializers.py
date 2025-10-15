from rest_framework import serializers
from .models import Member, Area, House, Collection, SubCollection, MemberObligation


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = '__all__'


class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'


class MemberSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False)

    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ('member_id',)


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = '__all__'


class SubCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCollection
        fields = '__all__'


class MemberObligationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberObligation
        fields = '__all__'
