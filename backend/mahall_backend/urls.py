from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# Simple view to return a basic response for the root URL with backup/restore options
def home_view(request):
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mahali Backend API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; }
            .info { background-color: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .backup-section { background-color: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0; }
            .backup-section h2 { color: #555; }
            .btn { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
            .btn:hover { background-color: #0056b3; }
            .btn-secondary { background-color: #6c757d; }
            .btn-secondary:hover { background-color: #545b62; }
            .btn-success { background-color: #28a745; }
            .btn-success:hover { background-color: #1e7e34; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Mahali Backend API Server</h1>
            
            <div class="info">
                <p><strong>API Status:</strong> Running</p>
                <p><strong>API Endpoint:</strong> <a href="/api/">/api/</a></p>
                <p>Access API endpoints at <code>/api/</code></p>
            </div>
            
            <div class="backup-section">
                <h2>Backup & Restore</h2>
                <p>Manage your Mahali application data:</p>
                
                <a href="#" class="btn btn-success" onclick="createBackup()">Create Backup</a>
                <a href="#" class="btn" onclick="restoreBackup()">Restore Backup</a>
                
                <div id="status" style="margin-top: 20px; padding: 10px; display: none;"></div>
            </div>
            
            <div class="backup-section">
                <h2>Database Management</h2>
                <p>Reset database to clean state:</p>
                
                <a href="#" class="btn btn-secondary" onclick="resetDatabase()" style="background-color: #dc3545;">Reset Database (Clean Start)</a>
            </div>
        </div>
        
        <script>
            function showMessage(message, isError = false) {
                const statusDiv = document.getElementById('status');
                statusDiv.textContent = message;
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
                statusDiv.style.color = isError ? '#721c24' : '#155724';
                statusDiv.style.border = isError ? '1px solid #f5c6cb' : '1px solid #c3e6cb';
            }
            
            function createBackup() {
                showMessage('Backup functionality is available in the desktop application.');
            }
            
            function restoreBackup() {
                showMessage('Restore functionality is available in the desktop application.');
            }
            
            function resetDatabase() {
                if (confirm('Are you sure you want to reset the database? This will delete all data.')) {
                    showMessage('Database reset functionality is available in the desktop application.');
                }
            }
        </script>
    </body>
    </html>
    """
    return HttpResponse(html_content)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('society.urls')),
    # In production (Electron app), we don't serve the frontend through Django
    # The React frontend is served statically by Electron
    path('', home_view, name='home'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve static files in production
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)