
import os
import json
import logging
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from django.conf import settings
from .models import AppSettings

logger = logging.getLogger(__name__)

class GoogleDriveService:
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'  # Using OOB for simplicity given it's a desktop/local app context or need custom handling
    # Note: For web apps, we should use a proper callback URL. Since this seems to be a hybrid/local app, we might need to adjust.
    # If the frontend is at localhost:5173, we can use that as redirect URI if configured in Google Cloud Console.
    # Let's try to use a postmessage flow or manual copy-paste if needed, but standard web flow is better.
    # For this implementation, I will assume we can redirect to a frontend page that captures the code.
    
    def __init__(self):
        self.settings = AppSettings.objects.order_by('-updated_at').first()
        self.creds = None
        self.service = None
        
        if self.settings and self.settings.google_drive_refresh_token:
            self.creds = self._get_credentials_from_settings()

    def _get_credentials_from_settings(self):
        """Reconstruct credentials from stored refresh token"""
        try:
            client_config = {
                "installed": {
                    "client_id": self.settings.google_drive_client_id,
                    "client_secret": self.settings.google_drive_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            }
            
            creds = Credentials.from_authorized_user_info(
                info={
                    'client_id': self.settings.google_drive_client_id,
                    'client_secret': self.settings.google_drive_client_secret,
                    'refresh_token': self.settings.google_drive_refresh_token,
                    'token_uri': "https://oauth2.googleapis.com/token",
                },
                scopes=self.SCOPES
            )
            return creds
        except Exception as e:
            logger.error(f"Error restoring credentials: {e}")
            return None

    def get_auth_url(self, redirect_uri):
        """Generate OAuth 2.0 authorization URL"""
        if not self.settings or not self.settings.google_drive_client_id or not self.settings.google_drive_client_secret:
            raise ValueError("Google Drive Client ID and Secret are not configured.")

        client_config = {
            "web": {
                "client_id": self.settings.google_drive_client_id,
                "client_secret": self.settings.google_drive_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return auth_url

    def exchange_code(self, code, redirect_uri):
        """Exchange auth code for credentials"""
        if not self.settings:
            raise ValueError("Settings not initialized")

        client_config = {
            "web": {
                "client_id": self.settings.google_drive_client_id,
                "client_secret": self.settings.google_drive_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        # Save refresh token
        self.settings.google_drive_refresh_token = creds.refresh_token
        self.settings.google_drive_enabled = True
        self.settings.save()
        
        self.creds = creds
        return True

    def get_service(self):
        """Get or create Drive API service"""
        if self.service:
            return self.service

        if not self.creds:
            if self.settings and self.settings.google_drive_refresh_token:
                self.creds = self._get_credentials_from_settings()
            
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    logger.error(f"Error refreshing token: {e}")
                    return None
            else:
                return None

        self.service = build('drive', 'v3', credentials=self.creds)
        return self.service

    def ensure_backup_folder(self):
        """Create 'Mahall Backups' folder if not exists"""
        service = self.get_service()
        if not service:
            return None

        folder_id = self.settings.google_drive_folder_id

        # Verify if folder exists
        if folder_id:
            try:
                service.files().get(fileId=folder_id).execute()
                return folder_id
            except:
                # Folder might be deleted or invalid
                logger.warning("Stored backup folder ID invalid, searching/creating new one.")
                pass

        # Search for folder
        query = "mimeType='application/vnd.google-apps.folder' and name='Mahall Backups' and trashed=false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = results.get('files', [])

        if files:
            folder_id = files[0]['id']
        else:
            # Create folder
            file_metadata = {
                'name': 'Mahall Backups',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = service.files().create(body=file_metadata, fields='id').execute()
            folder_id = folder.get('id')

        # Update settings
        self.settings.google_drive_folder_id = folder_id
        self.settings.save()
        
        return folder_id

    def upload_file(self, file_path, file_name=None):
        """Upload a file to the backup folder"""
        service = self.get_service()
        if not service:
            raise Exception("Could not initialize Google Drive service")

        folder_id = self.ensure_backup_folder()
        if not folder_id:
            raise Exception("Could not get backup folder")

        if not file_name:
            file_name = os.path.basename(file_path)

        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        media = MediaFileUpload(file_path, resumable=True)
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        return file.get('id')

    def list_backups(self):
        """List backup files in the backup folder"""
        service = self.get_service()
        if not service:
            return []

        folder_id = self.ensure_backup_folder()
        if not folder_id:
            return []

        query = f"'{folder_id}' in parents and trashed=false"
        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name, createdTime, size)',
            orderBy='createdTime desc'
        ).execute()

        return results.get('files', [])

    def download_file(self, file_id, destination_path):
        """Download a file from Drive to local destination"""
        service = self.get_service()
        if not service:
            raise Exception("Could not initialize Google Drive service")

        request = service.files().get_media(fileId=file_id)
        
        import io
        from googleapiclient.http import MediaIoBaseDownload
        
        fh = io.FileIO(destination_path, 'wb')
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            
        fh.close()
        return destination_path
