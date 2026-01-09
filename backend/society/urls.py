from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MemberViewSet, AreaViewSet, HouseViewSet, CollectionViewSet, SubCollectionViewSet, MemberObligationViewSet, DashboardViewSet, TodoViewSet, AppSettingsViewSet

router = DefaultRouter()
router.register(r'areas', AreaViewSet)
router.register(r'houses', HouseViewSet)
router.register(r'members', MemberViewSet)
router.register(r'collections', CollectionViewSet)
router.register(r'subcollections', SubCollectionViewSet)
router.register(r'obligations', MemberObligationViewSet)
router.register(r'todos', TodoViewSet)
router.register(r'settings', AppSettingsViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

from .views import RecentActionViewSet
router.register(r'recent-actions', RecentActionViewSet)


urlpatterns = [
    path('', include(router.urls)),
]