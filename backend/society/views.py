from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Sum, Count
from django.http import HttpResponse, Http404
from django.conf import settings
from django.core.management import execute_from_command_line
from .models import Member, Area, House, Collection, SubCollection, MemberObligation, Todo, AppSettings, DigitalRequest
from .serializers import MemberSerializer, AreaSerializer, HouseSerializer, CollectionSerializer, SubCollectionSerializer, MemberObligationSerializer, MemberObligationDetailSerializer, TodoSerializer, AppSettingsSerializer, DigitalRequestSerializer
import os
import zipfile
import tempfile
import shutil
from typing import Any
import difflib

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
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check_duplicates(self, request):
        """
        Check for duplicate houses based on name and family name.
        """
        house_name = request.query_params.get('house_name', '').strip()
        family_name = request.query_params.get('family_name', '').strip()
        
        if not house_name and not family_name:
            return Response([])
            
        # Strategy:
        # 1. Fetch a broad set of candidates (e.g. all houses, or filtered by first letter if dataset is huge)
        # 2. Score them using difflib
        
        queryset = House.objects.all()
        candidates = list(queryset) # For SQLite/small-medium datasets, fetching all is okay (~1000s). For larger, filter first.
        
        results = []
        for house in candidates:
            score = 0
            checks = 0
            
            if house_name:
                checks += 1
                # Check house name similarity
                s = difflib.SequenceMatcher(None, house_name.lower(), house.house_name.lower()).ratio()
                score += s
                
            if family_name and house.family_name:
                checks += 1
                # Check family name similarity
                s = difflib.SequenceMatcher(None, family_name.lower(), house.family_name.lower()).ratio()
                score += s
            
            # Normalize score
            final_score = (score / checks) if checks > 0 else 0
            
            # Threshold: > 0.6 means decent similarity (e.g. "muhammed" vs "mohammed" is high)
            if final_score > 0.6:
                results.append({
                    'data': house,
                    'score': final_score
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        top_matches = [r['data'] for r in results[:10]]
        
        serializer = self.get_serializer(top_matches, many=True)
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

        # Column specific filters
        member_id_filter = self.request.query_params.get('member_id', None)
        name_filter = self.request.query_params.get('name', None)
        father_filter = self.request.query_params.get('father_name', None)
        mother_filter = self.request.query_params.get('mother_name', None)
        phone_filter = self.request.query_params.get('phone', None)
        whatsapp_filter = self.request.query_params.get('whatsapp', None)
        adhar_filter = self.request.query_params.get('adhar', None)
        gender_filter = self.request.query_params.get('gender', None)
        house_name_filter = self.request.query_params.get('house_name', None)
        
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

        # Apply column filters
        if member_id_filter:
            queryset = queryset.filter(member_id__icontains=member_id_filter)
        if name_filter:
            queryset = queryset.filter(Q(name__icontains=name_filter) | Q(surname__icontains=name_filter))
        if father_filter:
            queryset = queryset.filter(father_name__icontains=father_filter)
        if mother_filter:
            queryset = queryset.filter(mother_name__icontains=mother_filter)
        if phone_filter:
            queryset = queryset.filter(phone__icontains=phone_filter)
        if whatsapp_filter:
            queryset = queryset.filter(whatsapp__icontains=whatsapp_filter)
        if adhar_filter:
            queryset = queryset.filter(adhar__icontains=adhar_filter)
        if gender_filter:
            queryset = queryset.filter(gender__iexact=gender_filter)
        if house_name_filter:
            queryset = queryset.filter(house__house_name__icontains=house_name_filter)
            
        # Add support for direct house ID filtering
        house_id = self.request.query_params.get('house', None) or self.request.query_params.get('home_id', None)
        if house_id:
            queryset = queryset.filter(house__home_id=house_id)

        # Add support for firebase_id filtering
        firebase_id = self.request.query_params.get('firebase_id', None)
        if firebase_id:
            queryset = queryset.filter(firebase_id=firebase_id)

        return queryset
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search members with fuzzy matching filters and pagination"""
        search_term = request.query_params.get('search', '').strip()
        
        # If no search term, use standard filtering/pagination
        if not search_term:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        # --- Fuzzy Search Logic ---
        
        # 1. Get base queryset with OTHER filters applied (e.g. Area, Status)
        # We temporarily remove the 'search' param from request to avoid double-filtering
        # if the standard filter logic does simple icontains.
        # But `get_queryset` handles 'search' manually. 
        # Strategy: We'll manually call filter_queryset but strictly we want to avoid 
        # the standard `icontains` if we are doing fuzzy.
        # However, `get_queryset` implementation (lines 165-171) applies strict filter if `search` is present.
        # We should probably bypass `get_queryset`'s search filter or relax it.
        # EASIEST: Just use `get_queryset` but pass `search=None` to it by tricking it, 
        # or better: Fetch all (filtered by other params) and filter in memory.
        
        # Determine filters from request, excluding 'search'
        base_qs = Member.objects.all().select_related('house')
        area_id = request.query_params.get('area', None)
        status_param = request.query_params.get('status', None)
        
        if area_id:
            base_qs = base_qs.filter(house__area=area_id)
        if status_param:
            base_qs = base_qs.filter(status=status_param)
            
        # Fetch candidates
        candidates = list(base_qs)
        
        scored_results = []
        term_lower = search_term.lower()
        
        for m in candidates:
            # Calculate match score
            # We check: Name (high weight), Surname, House Name, ID
            score = 0
            max_possible = 0
            
            # Name
            if m.name:
                s = difflib.SequenceMatcher(None, term_lower, m.name.lower()).ratio()
                score += (s * 3) # Weight 3
                max_possible += 3
                
                # Check contains bonus
                if term_lower in m.name.lower():
                    score += 0.5
            
            # Surname
            if m.surname:
                s = difflib.SequenceMatcher(None, term_lower, m.surname.lower()).ratio()
                score += s
                max_possible += 1
                
            # House Name
            if m.house and m.house.house_name:
                s = difflib.SequenceMatcher(None, term_lower, m.house.house_name.lower()).ratio()
                score += s
                max_possible += 1
            
            # Member ID (Exact or approximate)
            if str(m.member_id).lower() == term_lower:
                score += 5 # Massive boost for ID match
            elif term_lower in str(m.member_id).lower():
                score += 2
                
            # Normalize? Or just use raw score.
            # Let's normalize slightly by dividing by weights if we want a 0-1 range, 
            # but raw score is fine for sorting.
            
            # Heuristic threshold: 
            # If name match is decent (>0.6), score will be > 1.8. 
            # Let's simple filter low matches.
            
            # A simple fast includes check to always include strict matches even if diff is weird
            is_strict_match = (
                term_lower in (m.name or "").lower() or 
                term_lower in (m.surname or "").lower() or 
                term_lower in str(m.member_id).lower()
            )
            
            if score > 1.5 or is_strict_match:
                scored_results.append((m, score))
        
        # Sort by score descending
        scored_results.sort(key=lambda x: x[1], reverse=True)
        
        # Extract members
        final_list = [x[0] for x in scored_results]
        
        # Pagination
        page = self.paginate_queryset(final_list)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(final_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def family_tree(self, request, member_id=None):
        """
        Get the family tree graph for a specific member.
        Returns: [Target, Parents, Spouse, Children, Siblings]
        """
        try:
            member = self.get_object()
        except Member.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)

        # 1. Collect all related members
        relatives = {member}

        # Parents
        if member.father: relatives.add(member.father)
        if member.mother: relatives.add(member.mother)

        # Spouse
        if member.married_to: relatives.add(member.married_to)

        # Children (where this member is father OR mother)
        children = Member.objects.filter(
            Q(father=member) | Q(mother=member)
        )
        for child in children:
            relatives.add(child)

        # Siblings (share father OR mother, exclude self)
        # Only fetch if parents exist to avoid fetching all orphans
        if member.father or member.mother:
            siblings_query = Q()
            if member.father:
                siblings_query |= Q(father=member.father)
            if member.mother:
                siblings_query |= Q(mother=member.mother)
            
            siblings = Member.objects.filter(siblings_query).exclude(pk=member.pk)
            for sib in siblings:
                relatives.add(sib)

        # Serialize
        serializer = self.get_serializer(list(relatives), many=True)
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
        data = serializer.data
        data['firebase_config'] = instance.firebase_config
        return Response(data)


class DigitalRequestViewSet(viewsets.ModelViewSet):
    queryset = DigitalRequest.objects.all()
    serializer_class = DigitalRequestSerializer
    ordering_fields = ['created_at']
    filterset_fields = ['status']

    def get_queryset(self):
        queryset = DigitalRequest.objects.all().order_by('-created_at')
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    @action(detail=False, methods=['get'])
    def search_parents(self, request):
        """
        Search for potential parents/spouses using fuzzy matching options.
        Query params:
        - search: Name term to search
        - father: Father's name term (optional)
        - grandfather: Grandfather's name term (optional)
        - house: House name term (optional)
        """
        search_term = request.query_params.get('search', '').strip()
        surname_term = request.query_params.get('surname', '').strip()
        father_term = request.query_params.get('father', '').strip()
        grandfather_term = request.query_params.get('grandfather', '').strip()
        spouse_term = request.query_params.get('spouse', '').strip()
        house_term = request.query_params.get('house', '').strip()
        
        # FUZZY SEARCH STRATEGY
        # 1. Fetch broad candidates. If search_term is present, filter by first letter or allow all if empty.
        #    Currently fetching all might be too heavy if DB is huge. optimize by filtering where possible.
        
        queryset = Member.objects.all().select_related('house', 'father', 'married_to')
        
        # Optimization: if search term exists, at least require first letter match? 
        # Or if "muhammed" vs "mohammed", first letter M matches. 
        # But if "Umer" vs "Omer", first letter differs.
        # For now, let's limit to active members or just fetch all (assuming < 10k members for now).
        # If > 10k, we need a better strategy (e.g. Trigram similarity in Postgres, but we are using SQLite).
        
        # For performance, let's filter by gender if known context? (Parent search usually implies gender)
        # But here we don't know the requested gender.
        
        candidates = list(queryset) # Evaluates the query
        
        scored_results = []
        
        for m in candidates:
            total_score = 0
            weights = 0
            
            # 1. Name Match (Highest Weight)
            if search_term:
                term = search_term.lower()
                name = m.name.lower()
                # Check name
                s1 = difflib.SequenceMatcher(None, term, name).ratio()
                
                # Check compound name parts? "Muhammed Ali" vs "Ali"
                # For now simple ratio.
                
                total_score += (s1 * 3) # Weight 3
                weights += 3
            
            # 2. Surname
            if surname_term:
                term = surname_term.lower()
                # surname might be empty in DB
                sur = (m.surname or "").lower()
                s2 = difflib.SequenceMatcher(None, term, sur).ratio()
                total_score += s2
                weights += 1
            
            # 3. Father
            if father_term:
                term = father_term.lower()
                f_name = (m.father_name or (m.father.name if m.father else "")).lower()
                s3 = difflib.SequenceMatcher(None, term, f_name).ratio()
                total_score += (s3 * 1.5)
                weights += 1.5
                
            # 4. Grandfather
            if grandfather_term:
                term = grandfather_term.lower()
                g_name = (m.grandfather_name or "").lower()
                s4 = difflib.SequenceMatcher(None, term, g_name).ratio()
                total_score += s4
                weights += 1
                
            # 5. Spouse
            if spouse_term:
                term = spouse_term.lower()
                sp_name = (m.married_to_name or (m.married_to.name if m.married_to else "")).lower()
                s5 = difflib.SequenceMatcher(None, term, sp_name).ratio()
                total_score += (s5 * 1.5)
                weights += 1.5
                
            # 6. House
            if house_term:
                term = house_term.lower()
                h_name = (m.house.house_name if m.house else "").lower()
                s6 = difflib.SequenceMatcher(None, term, h_name).ratio()
                total_score += s6
                weights += 1

            if weights == 0:
                continue # No search terms
                
            final_score = total_score / weights
            
            # Threshold
            if final_score > 0.55: # Slightly loose to allow finding "the one"
                scored_results.append((m, final_score))

        # Sort
        scored_results.sort(key=lambda x: x[1], reverse=True)
        top_results = [x[0] for x in scored_results[:20]]
        
        # Return detailed data
        data = []
        for m in top_results:
            house_name = m.house.house_name if m.house else "No House"
            father_name_disp = m.father.name if m.father else m.father_name
            
            data.append({
                'id': m.member_id,
                'name': m.name,
                'surname': m.surname,
                'house': house_name,
                'gender': m.gender,
                'age': m.date_of_birth,
                'father_name': father_name_disp,
                'grandfather_name': m.grandfather_name,
                'grandfather_name': m.grandfather_name,
                'spouse_name': m.married_to.name if m.married_to else m.married_to_name or "N/A",
                'phone': m.phone,
                'whatsapp': m.whatsapp,
                'adhar': m.adhar,
                'mother_name': m.mother.name if m.mother else m.mother_name,
                'mother_surname': m.mother.surname if m.mother else m.mother_surname,
            })
            
        return Response(data)

    @action(detail=False, methods=['post'])
    def sync_firebase(self, request):
        """
        Fetch pending requests from Firebase and save them to the local database.
        """
        try:
            # 1. Get Firebase Config
            setting = Settings.objects.first()
            if not setting or not setting.firebase_config:
                return Response({'error': 'Firebase not configured in settings'}, status=400)
            
            import json
            import firebase_admin
            from firebase_admin import credentials, firestore

            config = json.loads(setting.firebase_config)
            
            # Initialize Firebase App
            # We use a unique name to avoid conflicts if initialized multiple times
            if not firebase_admin._apps:
                # Assuming config is a service account dict. If it's a client config, this might vary.
                # For client-side config passed to backend, we might need a Service Account for admin privileges
                # OR we implement this sync on the FRONTEND and just push to this API.
                #
                # DECISION: To avoid backend dependency complexities with client-config,
                # let's assume the Frontend does the fetch (using its client SDK) and posts the data here?
                #
                # WAIT: The prompt is "there not listing data". The user expects it to work.
                # If I implement backend sync, I need a Service Account which the user might not have provided (only client config).
                # The previous frontend component `FirebaseDataImproved` used CLIENT SDK.
                #
                # PATH CORRECTION: It is safer and easier to replicate the Frontend Sync logic
                # inside `DigitalRequestsPage` (fetch from Firebase -> POST to Django) 
                # OR make this endpoint accept a list of requests to "bulk create".
                #
                # Let's revert to a simpler "Bulk Create" endpoint here, and let the Frontend handle the Firebase Connection
                # since the frontend already has the working config/SDK logic established in the previous file.
                pass

        except Exception as e:
            return Response({'error': str(e)}, status=500)
            
        return Response({'message': 'Sync logic should be client-side due to auth config types'})

    @action(detail=False, methods=['post'])
    def import_from_client(self, request):
        """
        Receive a list of request objects from the frontend (which fetched them from Firebase)
        and save them as DigitalRequest objects if they don't exist.
        """
        items = request.data.get('items', [])
        created_count = 0
        
        for item in items:
            firebase_id = item.get('id')
            if not firebase_id:
                continue
                
            # Check for duplicates
            if not DigitalRequest.objects.filter(firebase_id=firebase_id).exists():
                DigitalRequest.objects.create(
                    firebase_id=firebase_id,
                    data=item,
                    status='pending'
                )
                created_count += 1
                
        return Response({'created': created_count, 'message': f'Imported {created_count} requests.'})

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

class GoogleDriveViewSet(viewsets.ViewSet):
    """
    ViewSet for Google Drive integration
    """
    
    @action(detail=False, methods=['get'])
    def auth_url(self, request):
        """Get the Google OAuth 2.0 authorization URL"""
        try:
            from .google_drive_service import GoogleDriveService
            service = GoogleDriveService()
            
            # The redirect URI should match what's configured in Google Cloud Console
            # For this desktop/local app, we might need a specific handling.
            # We'll expect the frontend to provide the redirect_uri it's using (or we define one)
            redirect_uri = request.query_params.get('redirect_uri', 'http://localhost:5173/settings/google-callback')
            
            auth_url = service.get_auth_url(redirect_uri)
            return Response({'auth_url': auth_url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def connect(self, request):
        """Exchange auth code for credentials"""
        try:
            code = request.data.get('code')
            redirect_uri = request.data.get('redirect_uri', 'http://localhost:5173/settings/google-callback')
            
            if not code:
                return Response({'error': 'Auth code is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            from .google_drive_service import GoogleDriveService
            service = GoogleDriveService()
            success = service.exchange_code(code, redirect_uri)
            
            if success:
                return Response({'message': 'Successfully connected to Google Drive'})
            else:
                return Response({'error': 'Failed to connect'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        """Disconnect Google Drive"""
        try:
            settings = AppSettings.objects.order_by('-updated_at').first()
            if settings:
                settings.google_drive_enabled = False
                settings.google_drive_refresh_token = None
                settings.save()
            return Response({'message': 'Disconnected from Google Drive'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_backup(self, request):
        """Trigger a backup and upload to Google Drive"""
        try:
            from .google_drive_service import GoogleDriveService
            # Check if enabled
            settings_obj = AppSettings.objects.order_by('-updated_at').first()
            if not settings_obj or not settings_obj.google_drive_enabled:
                return Response({'error': 'Google Drive backup is not enabled'}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Create Local Backup
            from backup_restore import create_backup
            backup_path = create_backup()
            
            # 2. Upload to Drive
            service = GoogleDriveService()
            file_id = service.upload_file(backup_path)
            
            # 3. Update last backup time
            from django.utils import timezone
            settings_obj.last_backup_at = timezone.now()
            settings_obj.save()
            
            # Optional: Clean up local backup if desired, or keep it.
            # For now we keep it as it's useful.
            
            return Response({
                'message': 'Backup created and uploaded successfully',
                'file_id': file_id,
                'local_path': backup_path
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def list_backups(self, request):
        """List available backups from Google Drive"""
        try:
            from .google_drive_service import GoogleDriveService
            service = GoogleDriveService()
            files = service.list_backups()
            return Response(files)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def restore(self, request):
        """Restore from a Google Drive backup file"""
        try:
            file_id = request.data.get('file_id')
            if not file_id:
                return Response({'error': 'File ID is required'}, status=status.HTTP_400_BAD_REQUEST)

            from .google_drive_service import GoogleDriveService
            import tempfile
            import os
            
            service = GoogleDriveService()
            
            # Download to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
                temp_path = temp_file.name
            
            try:
                service.download_file(file_id, temp_path)
                
                # Reuse the logic from import_data
                # We need to simulate the request.FILES or just call the logic directly
                # To be DRY, let's copy the extraction logic here or refactor.
                # Refactoring is better, but for now copying logic is safer to avoid breaking existing view.
                
                import zipfile
                import shutil
                from django.conf import settings
                
                with tempfile.TemporaryDirectory() as temp_dir:
                    with zipfile.ZipFile(temp_path, 'r') as zf:
                        zf.extractall(temp_dir)

                    # Replace database
                    db_source = os.path.join(temp_dir, 'db.sqlite3')
                    db_dest = settings.DATABASES['default']['NAME']
                    if os.path.exists(db_source):
                        # Close existing connections? Django usually handles this on request start
                        # but replacing the file might require care.
                        # For SQLite, replacing the file while app is running is risky but usually works if no write lock.
                        
                        # Backup current DB just in case?
                        # shutil.copy2(db_dest, db_dest + '.bak') 
                        
                        shutil.copy2(db_source, db_dest)

                    # Replace media files
                    media_temp = os.path.join(temp_dir)
                    # The zip structure might vary. Usually it's root -> db.sqlite3, media/
                    # Let's check if 'media' folder exists
                    
                    # If the zip was created by us (shutil.make_archive), it might not have 'media' folder if we zipped contents.
                    # Our backup script zips: db.sqlite3 and media folder.
                    
                    media_source_folder = os.path.join(temp_dir, 'media')
                    if os.path.exists(media_source_folder):
                         if os.path.exists(settings.MEDIA_ROOT):
                                shutil.rmtree(settings.MEDIA_ROOT)
                         shutil.copytree(media_source_folder, settings.MEDIA_ROOT)
                    else:
                        # Maybe files are in root?
                        pass

                return Response({'message': 'Restore completed successfully'})
                
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
