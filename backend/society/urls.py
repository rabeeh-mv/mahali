from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MemberViewSet, AreaViewSet, HouseViewSet, CollectionViewSet, SubCollectionViewSet, MemberObligationViewSet

router = DefaultRouter()
router.register(r'areas', AreaViewSet)
router.register(r'houses', HouseViewSet)
router.register(r'members', MemberViewSet)
router.register(r'collections', CollectionViewSet)
router.register(r'subcollections', SubCollectionViewSet)
router.register(r'obligations', MemberObligationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
