from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Sum, Count
from django.http import HttpResponse, Http404
from django.conf import settings
from django.core.management import execute_from_command_line
from .models import Member, Area, House, Collection, SubCollection, MemberObligation, Todo, AppSettings
from .serializers import MemberSerializer, AreaSerializer, HouseSerializer, CollectionSerializer, SubCollectionSerializer, MemberObligationSerializer, MemberObligationDetailSerializer, TodoSerializer, AppSettingsSerializer
import os
import zipfile
import tempfile
import shutil
from typing import Any

# Custom pagination class
class MemberPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100

class HousePagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100

class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer

class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.all()
    serializer_class = HouseSerializer
    lookup_field = 'home_id'
    pagination_class = HousePagination
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'search':
            from .serializers import HouseListSerializer
            return HouseListSerializer
        return HouseSerializer
    
    def get_queryset(self):
        queryset = House.objects.all()
        
        # Apply filters from query parameters
        search = self.request.query_params.get('search', None)
        area_id = self.request.query_params.get('area', None)
        
        if search:
            queryset = queryset.filter(
                Q(house_name__icontains=search) | 
                Q(family_name__icontains=search) | 
                Q(location_name__icontains=search)
            )
            
        if area_id:
            queryset = queryset.filter(area=area_id)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search houses with filters and pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            # Use the appropriate serializer based on the action
            serializer_class = self.get_serializer_class()
            serializer = serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        # Use the appropriate serializer based on the action
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(queryset, many=True)
        return Response(serializer.data)

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    lookup_field = 'member_id'
    pagination_class = MemberPagination
    
    def get_serializer_class(self):
        if self.action == 'search':
            from .serializers import MemberDetailSerializer
            return MemberDetailSerializer
        return MemberSerializer
    
    def get_queryset(self):
        queryset = Member.objects.all().select_related('house', 'house__area')
        
        # Apply filters from query parameters
        search = self.request.query_params.get('search', None)
        area_id = self.request.query_params.get('area', None)
        status = self.request.query_params.get('status', None)
        is_guardian = self.request.query_params.get('is_guardian', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(surname__icontains=search) | 
                Q(house__house_name__icontains=search) |
                Q(member_id__icontains=search)
            )
            
        if area_id:
            queryset = queryset.filter(house__area=area_id)
            
        if status:
            queryset = queryset.filter(status=status)
            
        if is_guardian is not None:
            is_guardian_bool = str(is_guardian).lower() == 'true'
            queryset = queryset.filter(isGuardian=is_guardian_bool)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search members with filters and pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class CollectionViewSet(viewsets.ModelViewSet):
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer

class SubCollectionViewSet(viewsets.ModelViewSet):
    queryset = SubCollection.objects.all()
    serializer_class = SubCollectionSerializer

class MemberObligationViewSet(viewsets.ModelViewSet):
    queryset = MemberObligation.objects.all()
    serializer_class = MemberObligationSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MemberObligationDetailSerializer
        return MemberObligationSerializer

    def update(self, request, *args, **kwargs):
        """Override update to allow partial updates"""
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def get_queryset(self):
        queryset = MemberObligation.objects.all()
        
        # Filter by subcollection if provided
        subcollection_id = self.request.query_params.get('subcollection', None)
        if subcollection_id:
            queryset = queryset.filter(subcollection=subcollection_id)
            
        # Search by member name or ID
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(member__name__icontains=search) | 
                Q(member__member_id__icontains=search)
            )
            
        # Filter by paid status
        paid_status = self.request.query_params.get('paid_status', None)
        if paid_status:
            queryset = queryset.filter(paid_status=paid_status)
            
        return queryset

    def create(self, request, *args, **kwargs):
        # Log the incoming data for debugging
        print("=== DEBUG: Incoming obligation data ===")
        print("Request data:", request.data)
        print("Member field type:", type(request.data.get('member')))
        print("Member field value:", request.data.get('member'))
        print("Subcollection field type:", type(request.data.get('subcollection')))
        print("Subcollection field value:", request.data.get('subcollection'))
        print("=====================================")
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple obligations at once"""
        # Log the incoming data for debugging
        print("=== DEBUG: Incoming bulk obligation data ===")
        print("Request data:", request.data)
        try:
            obligations_data = request.data.get('obligations', [])
            if not obligations_data:
                return Response({'error': 'No obligations data provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_obligations = []
            errors = []
            
            for i, obligation_data in enumerate(obligations_data):
                try:
                    print(f"--- Processing obligation {i+1} ---")
                    print("Obligation data:", obligation_data)
                    serializer = self.get_serializer(data=obligation_data)
                    if serializer.is_valid():
                        print("Serializer is valid")
                        obligation = serializer.save()
                        created_obligations.append(serializer.data)
                        print("Created obligation:", serializer.data)
                    else:
                        print("Serializer errors:", serializer.errors)
                        errors.append({
                            'data': obligation_data,
                            'errors': serializer.errors
                        })
                except Exception as e:
                    print("Exception during obligation creation:", str(e))
                    errors.append({
                        'data': obligation_data,
                        'errors': str(e)
                    })
            
            response_data = {
                'created': created_obligations,
                'errors': errors,
                'total_created': len(created_obligations),
                'total_errors': len(errors)
            }
            
            if errors:
                print("=== DEBUG: Response with errors ===")
                print("Response data:", response_data)
                print("==================================")
                return Response(response_data, status=status.HTTP_201_CREATED if created_obligations else status.HTTP_400_BAD_REQUEST)
            
            print("=== DEBUG: Successful response ===")
            print("Response data:", response_data)
            print("==================================")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print("Exception in bulk_create:", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'])
    def bulk_pay(self, request):
        """Mark multiple obligations as paid in a single database operation
        
        Expects a JSON payload with:
        {
            "obligation_ids": [1, 2, 3, ...]  # List of obligation IDs to mark as paid
        }
        
        Returns:
        {
            "updated_count": 3,  # Number of obligations actually updated
            "message": "Successfully marked 3 obligations as paid"
        }
        """
        try:
            obligation_ids = request.data.get('obligation_ids', [])
            if not obligation_ids:
                return Response({'error': 'No obligation IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update all obligations to paid status
            updated_count = MemberObligation.objects.filter(
                id__in=obligation_ids
            ).update(paid_status='paid')
            
            return Response({
                'updated_count': updated_count,
                'message': f'Successfully marked {updated_count} obligations as paid'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print("Exception in bulk_pay:", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search obligations with filters"""
        queryset = self.get_queryset()
        
        # Apply filters from query parameters
        subcollection_id = request.query_params.get('subcollection', None)
        search = request.query_params.get('search', None)
        area_id = request.query_params.get('area', None)
        paid_status = request.query_params.get('paid_status', None)
        
        if subcollection_id:
            queryset = queryset.filter(subcollection=subcollection_id)
        if search:
            queryset = queryset.filter(
                Q(member__name__icontains=search) | 
                Q(member__member_id__icontains=search)
            )
        if area_id:
            queryset = queryset.filter(member__house__area=area_id)
        if paid_status:
            # Handle combined pending/overdue status
            if paid_status == 'pending':
                queryset = queryset.filter(Q(paid_status='pending') | Q(paid_status='overdue'))
            else:
                queryset = queryset.filter(paid_status=paid_status)
                
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MemberObligationDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = MemberObligationDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get obligation statistics for a subcollection"""
        subcollection_id = request.query_params.get('subcollection', None)
        
        if not subcollection_id:
            return Response({'error': 'subcollection parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            subcollection = SubCollection.objects.get(id=subcollection_id)
        except SubCollection.DoesNotExist:
            return Response({'error': 'Subcollection not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get obligations for this subcollection
        obligations = MemberObligation.objects.filter(subcollection=subcollection)
        
        # Calculate statistics
        total_members = obligations.count()
        paid_count = obligations.filter(paid_status='paid').count()
        pending_count = obligations.filter(paid_status='pending').count()
        overdue_count = obligations.filter(paid_status='overdue').count()
        partial_count = obligations.filter(paid_status='partial').count()
        
        # Combine pending and overdue for "Pending / Overdue"
        pending_overdue_count = pending_count + overdue_count
        
        # Calculate amounts
        total_amount = obligations.aggregate(total=Sum('amount'))['total'] or 0
        paid_amount = obligations.filter(paid_status='paid').aggregate(total=Sum('amount'))['total'] or 0
        pending_amount = obligations.filter(Q(paid_status='pending') | Q(paid_status='overdue')).aggregate(total=Sum('amount'))['total'] or 0
        
        # Calculate collection progress percentage
        progress_percentage = (paid_amount / total_amount * 100) if total_amount > 0 else 0
        
        stats = {
            'total_members': total_members,
            'paid': {
                'count': paid_count,
                'amount': float(paid_amount)
            },
            'pending_overdue': {
                'count': pending_overdue_count,
                'amount': float(pending_amount)
            },
            'partial': {
                'count': partial_count,
                'amount': float(obligations.filter(paid_status='partial').aggregate(total=Sum('amount'))['total'] or 0)
            },
            'collection_progress': {
                'percentage': round(progress_percentage, 2),
                'paid_amount': float(paid_amount),
                'total_amount': float(total_amount)
            }
        }
        
        return Response(stats)

    @action(detail=False, methods=['post'])
    def export_data(self, request):
        """Export database and images to ZIP"""
        try:
            with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_zip:
                zip_path = temp_zip.name

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add database file
                db_path = settings.DATABASES['default']['NAME']
                if os.path.exists(db_path):
                    zf.write(db_path, 'db.sqlite3')

                # Add media folder
                media_root = settings.MEDIA_ROOT
                if os.path.exists(media_root):
                    for root, dirs, files in os.walk(media_root):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arc_name = os.path.relpath(file_path, media_root)
                            zf.write(file_path, arc_name)

            with open(zip_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='application/zip')
                response['Content-Disposition'] = 'attachment; filename="mahall_data.zip"'
                return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if 'zip_path' in locals() and os.path.exists(zip_path):
                os.remove(zip_path)

    @action(detail=False, methods=['post'])
    def import_data(self, request):
        """Import database and images from ZIP"""
        try:
            uploaded_file = request.FILES.get('zip_file')
            if not uploaded_file:
                return Response({'error': 'No ZIP file provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Extract to temp directory first
            with tempfile.TemporaryDirectory() as temp_dir:
                with zipfile.ZipFile(uploaded_file, 'r') as zf:
                    zf.extractall(temp_dir)

                # Replace database
                db_source = os.path.join(temp_dir, 'db.sqlite3')
                db_dest = settings.DATABASES['default']['NAME']
                if os.path.exists(db_source):
                    shutil.copy2(db_source, db_dest)

                # Replace media files
                media_temp = os.path.join(temp_dir)
                for item in os.listdir(media_temp):
                    if item != 'db.sqlite3':
                        source = os.path.join(media_temp, item)
                        dest = os.path.join(settings.MEDIA_ROOT, item)
                        if os.path.isdir(source):
                            if os.path.exists(dest):
                                shutil.rmtree(dest)
                            shutil.copytree(source, dest)
                        else:
                            shutil.copy2(source, dest)

            return Response({'message': 'Data imported successfully'})

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all()
    serializer_class = TodoSerializer

class AppSettingsViewSet(viewsets.ModelViewSet):
    queryset = AppSettings.objects.all()
    serializer_class = AppSettingsSerializer
    
    def get_queryset(self):
        # Return all settings (no filtering)
        return AppSettings.objects.all()
    
    def list(self, request, *args, **kwargs):
        # Return only the latest settings
        queryset = AppSettings.objects.all().order_by('-updated_at')
        print(f"=== DEBUG: AppSettingsViewSet.list ===")
        print(f"Queryset count: {queryset.count()}")
        if queryset.exists():
            instance = queryset.first()
            print(f"Instance ID: {instance.id}")
            print(f"Instance theme: {instance.theme}")
            print(f"Instance firebase_config: {repr(instance.firebase_config)}")
            print(f"Instance updated_at: {instance.updated_at}")
            serializer = self.get_serializer(instance)
            data = serializer.data
            print(f"Serialized data: {data}")
            return Response([data])
        else:
            # Return empty array if no settings exist
            print("No settings found")
            return Response([])
    
    def update(self, request, *args, **kwargs):
        # Use the default update behavior but ensure firebase_config is handled
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Ensure firebase_config is included in the response
        data = serializer.data
        data['firebase_config'] = instance.firebase_config
        return Response(data)

class DashboardViewSet(viewsets.ViewSet):
    """
    Dashboard API to provide statistics and status information
    """
    
    def list(self, request):
        """Return dashboard statistics"""
        # Get counts for each model
        stats = {
            'areas_count': Area.objects.count(),
            'houses_count': House.objects.count(),
            'members_count': Member.objects.count(),
            'collections_count': Collection.objects.count(),
            'subcollections_count': SubCollection.objects.count(),
            'obligations_count': MemberObligation.objects.count(),
            'todos_count': Todo.objects.count(),
            'completed_todos_count': Todo.objects.filter(completed=True).count(),
            'pending_todos_count': Todo.objects.filter(completed=False).count(),
            'members_by_status': {
                'live': Member.objects.filter(status='live').count(),
                'dead': Member.objects.filter(status='dead').count(),
                'terminated': Member.objects.filter(status='terminated').count(),
            },
            'obligations_by_status': {
                'pending': MemberObligation.objects.filter(paid_status='pending').count(),
                'paid': MemberObligation.objects.filter(paid_status='paid').count(),
                'overdue': MemberObligation.objects.filter(paid_status='overdue').count(),
                'partial': MemberObligation.objects.filter(paid_status='partial').count(),
            }
        }
        
        return Response(stats)

from .models import RecentAction
from .serializers import RecentActionSerializer

class RecentActionViewSet(viewsets.ModelViewSet):
    """
    Viewset for recent actions. Allows updating status.
    """

    queryset = RecentAction.objects.all()
    serializer_class = RecentActionSerializer
    ordering_fields = ['timestamp']
    filterset_fields = ['model_name', 'action_type', 'is_sync_pending']
