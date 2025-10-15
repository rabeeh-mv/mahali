from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse, Http404
from django.conf import settings
from django.core.management import execute_from_command_line
from .models import Member, Area, House, Collection, SubCollection, MemberObligation
from .serializers import MemberSerializer, AreaSerializer, HouseSerializer, CollectionSerializer, SubCollectionSerializer, MemberObligationSerializer
import os
import zipfile
import tempfile
import shutil

class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer

class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.all()
    serializer_class = HouseSerializer

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

class CollectionViewSet(viewsets.ModelViewSet):
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer

class SubCollectionViewSet(viewsets.ModelViewSet):
    queryset = SubCollection.objects.all()
    serializer_class = SubCollectionSerializer

class MemberObligationViewSet(viewsets.ModelViewSet):
    queryset = MemberObligation.objects.all()
    serializer_class = MemberObligationSerializer

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
            if os.path.exists(zip_path):
                os.unlink(zip_path)

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
