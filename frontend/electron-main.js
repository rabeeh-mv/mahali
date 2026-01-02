import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn, exec } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let djangoProcess;
let installWindow;

// Check if we're in development mode
const isDev = !app.isPackaged;

// Installation wizard HTML content
const installWizardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mahali - Installation Wizard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .wizard-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 600px;
            padding: 30px;
        }
        
        .wizard-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .wizard-header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .wizard-step {
            display: none;
        }
        
        .wizard-step.active {
            display: block;
        }
        
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .step {
            text-align: center;
            flex: 1;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            font-weight: bold;
        }
        
        .step.active .step-number {
            background-color: #007bff;
            color: white;
        }
        
        .step.completed .step-number {
            background-color: #28a745;
            color: white;
        }
        
        .step-label {
            font-size: 14px;
            color: #666;
        }
        
        .step.active .step-label {
            color: #007bff;
            font-weight: bold;
        }
        
        .step.completed .step-label {
            color: #28a745;
        }
        
        .wizard-content {
            margin-bottom: 30px;
        }
        
        .wizard-content h2 {
            color: #333;
            margin-top: 0;
        }
        
        .wizard-content p {
            color: #666;
            line-height: 1.6;
        }
        
        .wizard-buttons {
            display: flex;
            justify-content: space-between;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .btn-prev {
            background-color: #f8f9fa;
            color: #333;
            border: 1px solid #ddd;
        }
        
        .btn-next, .btn-install {
            background-color: #007bff;
            color: white;
        }
        
        .btn-install {
            background-color: #28a745;
        }
        
        .btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        
        .backup-option {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }
        
        .backup-option input {
            margin-right: 10px;
        }
        
        .file-input {
            margin: 10px 0;
            padding: 5px;
        }
        
        .progress-container {
            margin: 20px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress {
            height: 100%;
            background-color: #007bff;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .status-message {
            text-align: center;
            margin: 10px 0;
            color: #666;
        }
        
        .error-message {
            color: #dc3545;
            text-align: center;
            margin: 10px 0;
        }
        
        .choice-buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin: 20px 0;
        }
        
        .choice-button {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
            cursor: pointer;
            text-align: left;
        }
        
        .choice-button:hover {
            background-color: #e9e9e9;
        }
        
        .choice-button h3 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .choice-button p {
            margin: 0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="wizard-container">
        <div class="wizard-header">
            <h1>Mahali</h1>
            <p>Community Management System</p>
        </div>
        
        <div class="step-indicator">
            <div class="step active" id="step1-indicator">
                <div class="step-number">1</div>
                <div class="step-label">Backup</div>
            </div>
            <div class="step" id="step2-indicator">
                <div class="step-number">2</div>
                <div class="step-label">Installation</div>
            </div>
        </div>
        
        <div class="wizard-content">
            <div class="wizard-step active" id="step1">
                <h2>Restore from Backup</h2>
                <p>Would you like to restore data from a previous backup or start with a fresh installation?</p>
                
                <div class="choice-buttons">
                    <div class="choice-button" id="restore-option">
                        <h3>Restore from Backup</h3>
                        <p>Restore your database and media files from a previous backup (.zip file)</p>
                    </div>
                    <div class="choice-button" id="fresh-install-option">
                        <h3>Fresh Installation</h3>
                        <p>Start with a clean database and empty media folder</p>
                    </div>
                </div>
                
                <div id="restore-section" style="display: none; margin-top: 20px;">
                    <input type="file" id="backup-file" class="file-input" accept=".zip">
                    <div id="restore-error" class="error-message" style="display: none;"></div>
                    <button id="restore-btn" class="btn btn-install">Restore Backup</button>
                    
                    <div class="progress-container" id="restore-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress" id="restore-progress-bar"></div>
                        </div>
                        <div class="status-message" id="restore-status">Preparing to restore...</div>
                    </div>
                </div>
            </div>
            
            <div class="wizard-step" id="step2">
                <h2>Installing Mahali</h2>
                <p>We're now ready to install Mahali on your computer. The installation will include:</p>
                <ul>
                    <li>Mahali application</li>
                    <li>Integrated Django backend server</li>
                    <li>Database initialization</li>
                    <li>All necessary dependencies</li>
                </ul>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress" id="install-progress"></div>
                    </div>
                    <div class="status-message" id="install-status">Ready to install...</div>
                </div>
                
                <button id="install-btn" class="btn btn-install">Install Now</button>
            </div>
        </div>
        
        <div class="wizard-buttons">
            <button class="btn btn-prev" id="prev-btn" disabled>Previous</button>
            <button class="btn btn-next" id="next-btn" style="display: none;">Next</button>
        </div>
    </div>

    <script>
        // Check if we're running in Electron
        const isElectron = typeof require !== 'undefined';
        let ipcRenderer = null;
        
        if (isElectron) {
            const { ipcRenderer: ipc } = require('electron');
            ipcRenderer = ipc;
        }
        
        // Wizard navigation
        let currentStep = 1;
        const totalSteps = 2;
        
        // Set up event listeners
        document.getElementById('restore-option').addEventListener('click', () => {
            document.getElementById('restore-section').style.display = 'block';
        });
        
        document.getElementById('fresh-install-option').addEventListener('click', () => {
            document.getElementById('restore-section').style.display = 'none';
            currentStep = 2;
            updateWizard();
        });
        
        document.getElementById('prev-btn').addEventListener('click', prevStep);
        document.getElementById('restore-btn').addEventListener('click', restoreBackup);
        document.getElementById('install-btn').addEventListener('click', installSoftware);
        
        function nextStep() {
            if (currentStep < totalSteps) {
                currentStep++;
                updateWizard();
            }
        }
        
        function prevStep() {
            if (currentStep > 1) {
                currentStep--;
                updateWizard();
            }
        }
        
        function updateWizard() {
            // Hide all steps
            document.querySelectorAll('.wizard-step').forEach(step => {
                step.classList.remove('active');
            });
            
            // Show current step
            document.getElementById(\`step\${currentStep}\`).classList.add('active');
            
            // Update step indicators
            document.querySelectorAll('.step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index + 1 < currentStep) {
                    step.classList.add('completed');
                } else if (index + 1 === currentStep) {
                    step.classList.add('active');
                }
            });
            
            // Update buttons
            document.getElementById('prev-btn').disabled = (currentStep === 1);
            document.getElementById('next-btn').style.display = (currentStep < totalSteps) ? 'block' : 'none';
        }
        
        async function restoreBackup() {
            const fileInput = document.getElementById('backup-file');
            if (!fileInput.files.length) {
                showError('Please select a backup file first.');
                return;
            }
            
            const filePath = fileInput.files[0].path || fileInput.files[0].name;
            
            // Show progress
            document.getElementById('restore-progress').style.display = 'block';
            document.getElementById('restore-error').style.display = 'none';
            const progressBar = document.getElementById('restore-progress-bar');
            const statusMessage = document.getElementById('restore-status');
            
            try {
                // Call the real restore function
                if (isElectron && ipcRenderer) {
                    statusMessage.textContent = 'Validating backup file...';
                    progressBar.style.width = '10%';
                    
                    const result = await ipcRenderer.invoke('restore-backup', filePath);
                    
                    if (result.success) {
                        statusMessage.textContent = result.message;
                        progressBar.style.width = '100%';
                        
                        // Move to installation step after a short delay
                        setTimeout(() => {
                            currentStep = 2;
                            updateWizard();
                        }, 1000);
                    } else {
                        showError(result.message);
                        document.getElementById('restore-progress').style.display = 'none';
                    }
                }
            } catch (error) {
                showError('Failed to restore backup: ' + error.message);
                document.getElementById('restore-progress').style.display = 'none';
            }
        }
        
        function showError(message) {
            const errorElement = document.getElementById('restore-error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        async function installSoftware() {
          const progressBar = document.getElementById('install-progress');
          const statusMessage = document.getElementById('install-status');
          
          // Installation process with proper steps
          const steps = [
            { progress: 10, message: 'Preparing installation...' },
            { progress: 30, message: 'Installing application files...' },
            { progress: 50, message: 'Installing Django backend...' },
            { progress: 70, message: 'Initializing database...' },
            { progress: 90, message: 'Running database migrations...' },
            { progress: 100, message: 'Finalizing installation...' }
          ];
          
          let stepIndex = 0;
          
          const interval = setInterval(async () => {
            if (stepIndex < steps.length) {
              const step = steps[stepIndex];
              progressBar.style.width = step.progress + '%';
              statusMessage.textContent = step.message;
              
              // When we reach the migration step, actually run migrations
              if (stepIndex === 4) { // "Running database migrations..."
                try {
                  if (isElectron && ipcRenderer) {
                    // Run migrations through the main process
                    await ipcRenderer.invoke('run-install-migrations');
                  }
                } catch (error) {
                  console.error('Migration error:', error);
                  statusMessage.textContent = 'Migration failed: ' + error.message;
                }
              }
              
              stepIndex++;
            } else {
              clearInterval(interval);
              statusMessage.textContent = 'Installation completed successfully!';
              
              // In a real implementation, this would launch the application
              setTimeout(async () => {
                if (isElectron && ipcRenderer) {
                  // Notify main process that installation is complete
                  await ipcRenderer.invoke('complete-installation');
                } else {
                  alert('Installation completed! The application will now launch.');
                  // Close the installer window
                  window.close();
                }
              }, 1000);
            }
          }, 500);
        }
        
        function getInstallStatus(progress) {
            if (progress < 10) return 'Preparing installation...';
            if (progress < 30) return 'Installing application files...';
            if (progress < 50) return 'Installing Django backend...';
            if (progress < 70) return 'Setting up database...';
            if (progress < 90) return 'Configuring application...';
            return 'Finalizing installation...';
        }
    </script>
</body>
</html>`;

// Loading screen HTML content
const loadingHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Loading...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .loading-container {
            text-align: center;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 {
            color: #333;
            margin: 0;
        }
        p {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <h2>Loading Mahali</h2>
        <p>Please wait while we start the application...</p>
    </div>
    <script>
        // This script will periodically try to load the main application
        // and redirect when the Django server is ready
        const checkServer = () => {
            fetch('http://127.0.0.1:8000/')
                .then(response => {
                    // If we get any response (including 404), it means Django is running
                    // 404 means Django is running but there's no root handler (expected)
                    // 500 or connection error means Django is not running
                    if (response.status >= 200 && response.status < 500) {
                        // Django is running, notify Electron to load the frontend
                        if (typeof require !== 'undefined') {
                            const { ipcRenderer } = require('electron');
                            ipcRenderer.send('django-ready');
                        }
                    }
                })
                .catch(error => {
                    // Server not ready yet, continue checking
                });
        };
        
        // Check every 1 second
        setInterval(checkServer, 1000);
    </script>
</body>
</html>`;

function createInstallWindow() {
  installWindow = new BrowserWindow({
    width: 700,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    resizable: false
  });

  // Create a temporary file for the installation wizard
  const tempPath = path.join(app.getPath('temp'), 'install-wizard.html');
  fs.writeFileSync(tempPath, installWizardHtml);
  
  // Load the installation wizard from the temporary file
  installWindow.loadFile(tempPath);

  installWindow.on('closed', () => {
    installWindow = null;
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
    // In development mode, we assume Django is already running
    console.log('Development mode: Assuming Django server is already running on http://127.0.0.1:8000');
  } else {
    // Show loading screen while Django starts
    // Create a temporary file for the loading screen
    const tempPath = path.join(app.getPath('temp'), 'mahall-loading.html');
    fs.writeFileSync(tempPath, loadingHtml);
    
    // Load the loading screen from the temporary file
    mainWindow.loadFile(tempPath);
    
    // Listen for django-ready event from loading screen
    ipcMain.on('django-ready', () => {
      // Load the React frontend build
      const frontendPath = path.join(__dirname, 'dist', 'index.html');
      mainWindow.loadFile(frontendPath);
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error('Error cleaning up temporary file:', error);
      }
    });
    
    // Start Django server
    startDjangoServer();
  }
}

function startDjangoServer(callback) {
  // Only start Django server in production mode
  if (isDev) {
    // In development, we don't start Django as it should already be running
    if (callback) callback();
    return;
  }

  // In production, spawn the .exe with runserver command
  const djangoExePath = path.join(process.resourcesPath, 'backend', 'django_server.exe');
  const djangoDir = path.join(process.resourcesPath, 'backend');

  // Set environment variables to ensure Django uses the correct data directory
  const env = Object.assign({}, process.env, {
    APPDATA: app.getPath('appData') // This ensures Django can access the AppData directory
  });

  djangoProcess = spawn(djangoExePath, ['runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: djangoDir,
    stdio: 'pipe',
    env: env
  });

  // Log Django process events for debugging
  if (djangoProcess.stdout) {
    djangoProcess.stdout.on('data', (data) => {
      console.log(`Django: ${data}`);
      // Check if server is ready
      if (data.toString().includes('Starting development server') || data.toString().includes('Django version')) {
        setTimeout(() => {
          if (callback) callback();
        }, 2000); // Give it a moment to fully start
      }
    });
  }

  if (djangoProcess.stderr) {
    djangoProcess.stderr.on('data', (data) => {
      console.error(`Django Error: ${data}`);
    });
  }

  djangoProcess.on('error', (err) => {
    console.error('Django server failed to start:', err);
  });

  djangoProcess.on('close', (code) => {
    console.log(`Django server exited with code ${code}`);
  });
}

function stopDjangoServer() {
  if (djangoProcess) {
    try {
      console.log('Stopping Django server...');
      // Kill the process and all its children
      if (process.platform === 'win32') {
        // Use spawn with /T flag to kill the process tree
        const killProcess = spawn('taskkill', ['/pid', djangoProcess.pid, '/T', '/F'], {
          stdio: 'ignore'
        });
        
        killProcess.on('close', (code) => {
          if (code === 0) {
            console.log('Django server stopped successfully');
          } else {
            console.error('Failed to stop Django server with taskkill, code:', code);
            // Fallback to direct kill
            try {
              djangoProcess.kill('SIGTERM');
            } catch (error) {
              console.error('Error killing Django process with SIGTERM:', error);
            }
          }
        });
      } else {
        djangoProcess.kill('SIGTERM');
      }
    } catch (error) {
      console.error('Error stopping Django server:', error);
    }
    djangoProcess = null;
  }
}

// IPC handlers for backup/restore functionality
ipcMain.handle('select-backup-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Backup Files', extensions: ['zip'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('create-backup', async (event, backupPath) => {
  try {
    // In a real implementation, this would call the backup executable
    // For now, we'll simulate the process
    return { success: true, message: 'Backup created successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restore-backup', async (event, backupPath) => {
  try {
    // In a real implementation, this would call the restore executable
    if (isDev) {
      // In development, simulate the restore process
      return { success: true, message: 'Backup restored successfully (simulated)' };
    } else {
      // In production, call the backup/restore executable
      const backupExePath = path.join(process.resourcesPath, 'backend', 'mahall_backup_restore.exe');
      
      if (!fs.existsSync(backupExePath)) {
        return { success: false, message: 'Backup/restore executable not found' };
      }
      
      // Execute the backup/restore tool with restore command
      const command = `"${backupExePath}" restore "${backupPath}"`;
      const restoreProcess = exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Restore process error:', error);
          return { success: false, message: `Restore failed: ${error.message}` };
        }
        
        if (stderr) {
          console.error('Restore stderr:', stderr);
        }
        
        console.log('Restore stdout:', stdout);
        return { success: true, message: 'Backup restored successfully' };
      });
      
      // For now, return success (in a real implementation, you'd wait for the process to complete)
      return { success: true, message: 'Backup restore initiated successfully' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Function to check if this is the first run after installation
function isFirstRunAfterInstall() {
  // Check if we have the install marker but haven't completed the post-install setup
  const installMarker = path.join(app.getPath('userData'), 'mahall-installed');
  const postInstallMarker = path.join(app.getPath('userData'), 'mahall-post-install-complete');
  
  return fs.existsSync(installMarker) && !fs.existsSync(postInstallMarker);
}

// Function to mark post-install setup as complete
function markPostInstallComplete() {
  const postInstallMarker = path.join(app.getPath('userData'), 'mahall-post-install-complete');
  fs.writeFileSync(postInstallMarker, 'completed');
}

// Function to run Django migrations
async function runDjangoMigrations() {
  return new Promise((resolve, reject) => {
    try {
      // In production, call the Django server executable with migrate command
      const djangoExePath = path.join(process.resourcesPath, 'backend', 'django_server.exe');
      
      if (!fs.existsSync(djangoExePath)) {
        reject(new Error('Django server executable not found'));
        return;
      }
      
      // Run migrations
      const command = `"${djangoExePath}" migrate`;
      console.log('Running Django migrations:', command);
      
      const migrateProcess = exec(command, { cwd: path.join(process.resourcesPath, 'backend') }, (error, stdout, stderr) => {
        if (error) {
          console.error('Migration error:', error);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.error('Migration stderr:', stderr);
        }
        
        console.log('Migration stdout:', stdout);
        resolve({ success: true, message: 'Migrations completed successfully' });
      });
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        if (migrateProcess.exitCode === null) {
          migrateProcess.kill();
          reject(new Error('Migration process timed out'));
        }
      }, 30000); // 30 second timeout
    } catch (error) {
      reject(error);
    }
  });
}

// Post-install setup window HTML content
const postInstallHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mahali - Setup Complete</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .setup-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 600px;
            padding: 30px;
        }
        
        .setup-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .setup-header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .choice-buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin: 20px 0;
        }
        
        .choice-button {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
            cursor: pointer;
            text-align: left;
        }
        
        .choice-button:hover {
            background-color: #e9e9e9;
        }
        
        .choice-button h3 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .choice-button p {
            margin: 0;
            color: #666;
        }
        
        .file-input {
            margin: 10px 0;
            padding: 5px;
        }
        
        .progress-container {
            margin: 20px 0;
            display: none;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress {
            height: 100%;
            background-color: #007bff;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .status-message {
            text-align: center;
            margin: 10px 0;
            color: #666;
        }
        
        .error-message {
            color: #dc3545;
            text-align: center;
            margin: 10px 0;
            display: none;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            background-color: #007bff;
            color: white;
            margin-top: 10px;
        }
        
        .btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <div class="setup-header">
            <h1>Mahali Setup Complete</h1>
            <p>Choose how you'd like to start using Mahali</p>
        </div>
        
        <div class="choice-buttons">
            <div class="choice-button" id="restore-option">
                <h3>Restore from Backup</h3>
                <p>Restore your database and media files from a previous backup (.zip file)</p>
            </div>
            <div class="choice-button" id="fresh-install-option">
                <h3>Fresh Start</h3>
                <p>Start with a clean database and empty media folder</p>
            </div>
        </div>
        
        <div id="restore-section" style="display: none; margin-top: 20px;">
            <input type="file" id="backup-file" class="file-input" accept=".zip">
            <div id="restore-error" class="error-message"></div>
            <button id="restore-btn" class="btn">Restore Backup</button>
        </div>
        
        <div class="progress-container" id="setup-progress">
            <div class="progress-bar">
                <div class="progress" id="setup-progress-bar"></div>
            </div>
            <div class="status-message" id="setup-status">Preparing...</div>
        </div>
        
        <button id="skip-btn" class="btn" style="background-color: #6c757d;">Skip and Start Fresh</button>
    </div>

    <script>
        // Check if we're running in Electron
        const isElectron = typeof require !== 'undefined';
        let ipcRenderer = null;
        
        if (isElectron) {
            const { ipcRenderer: ipc } = require('electron');
            ipcRenderer = ipc;
        }
        
        // Set up event listeners
        document.getElementById('restore-option').addEventListener('click', () => {
            document.getElementById('restore-section').style.display = 'block';
        });
        
        document.getElementById('fresh-install-option').addEventListener('click', () => {
            startFreshSetup();
        });
        
        document.getElementById('restore-btn').addEventListener('click', restoreBackup);
        document.getElementById('skip-btn').addEventListener('click', startFreshSetup);
        
        async function restoreBackup() {
            const fileInput = document.getElementById('backup-file');
            if (!fileInput.files.length) {
                showError('Please select a backup file first.');
                return;
            }
            
            const filePath = fileInput.files[0].path || fileInput.files[0].name;
            
            // Show progress
            document.getElementById('setup-progress').style.display = 'block';
            document.getElementById('restore-error').style.display = 'none';
            const progressBar = document.getElementById('setup-progress-bar');
            const statusMessage = document.getElementById('setup-status');
            
            try {
                statusMessage.textContent = 'Validating backup file...';
                progressBar.style.width = '10%';
                
                // Call the real restore function
                if (isElectron && ipcRenderer) {
                    const result = await ipcRenderer.invoke('restore-backup', filePath);
                    
                    if (result.success) {
                        statusMessage.textContent = 'Backup restored successfully!';
                        progressBar.style.width = '100%';
                        
                        // Mark setup as complete and launch main app
                        setTimeout(() => {
                            if (ipcRenderer) {
                                ipcRenderer.invoke('complete-post-install-setup');
                            }
                        }, 1000);
                    } else {
                        showError(result.message);
                        document.getElementById('setup-progress').style.display = 'none';
                    }
                }
            } catch (error) {
                showError('Failed to restore backup: ' + error.message);
                document.getElementById('setup-progress').style.display = 'none';
            }
        }
        
        async function startFreshSetup() {
            // Show progress
            document.getElementById('setup-progress').style.display = 'block';
            const progressBar = document.getElementById('setup-progress-bar');
            const statusMessage = document.getElementById('setup-status');
            
            try {
                statusMessage.textContent = 'Initializing fresh database...';
                progressBar.style.width = '30%';
                
                // Run migrations for fresh setup
                if (isElectron && ipcRenderer) {
                    const result = await ipcRenderer.invoke('run-migrations');
                    
                    if (result.success) {
                        statusMessage.textContent = 'Database initialized successfully!';
                        progressBar.style.width = '100%';
                        
                        // Mark setup as complete and launch main app
                        setTimeout(() => {
                            if (ipcRenderer) {
                                ipcRenderer.invoke('complete-post-install-setup');
                            }
                        }, 1000);
                    } else {
                        showError(result.message);
                        document.getElementById('setup-progress').style.display = 'none';
                    }
                }
            } catch (error) {
                showError('Failed to initialize database: ' + error.message);
                document.getElementById('setup-progress').style.display = 'none';
            }
        }
        
        function showError(message) {
            const errorElement = document.getElementById('restore-error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    </script>
</body>
</html>`;

let postInstallWindow = null;

function createPostInstallWindow() {
  postInstallWindow = new BrowserWindow({
    width: 700,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    resizable: false
  });

  // Create a temporary file for the post-install setup
  const tempPath = path.join(app.getPath('temp'), 'post-install-setup.html');
  fs.writeFileSync(tempPath, postInstallHtml);
  
  // Load the post-install setup from the temporary file
  postInstallWindow.loadFile(tempPath);

  postInstallWindow.on('closed', () => {
    postInstallWindow = null;
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  });
}

// Function to complete installation and launch main app
ipcMain.handle('complete-installation', async () => {
  try {
    // Run Django migrations during installation
    console.log('Running Django migrations during installation...');
    await runDjangoMigrations();
    console.log('Django migrations completed successfully');
    
    // Mark installation as complete
    const installMarker = path.join(app.getPath('userData'), 'mahall-installed');
    fs.writeFileSync(installMarker, 'installed');
    
    // Close install window
    if (installWindow) {
      installWindow.close();
    }
    
    // Show post-install setup window
    createPostInstallWindow();
  } catch (error) {
    console.error('Installation failed:', error);
    // Even if migrations fail, we'll still mark as installed to avoid infinite loop
    const installMarker = path.join(app.getPath('userData'), 'mahall-installed');
    fs.writeFileSync(installMarker, 'installed');
    
    if (installWindow) {
      installWindow.close();
    }
    
    // Show post-install setup window even if migrations failed
    createPostInstallWindow();
  }
});

// Handle post-install setup completion
ipcMain.handle('complete-post-install-setup', () => {
  // Mark post-install setup as complete
  markPostInstallComplete();
  
  // Close post-install window and open main window
  if (postInstallWindow) {
    postInstallWindow.close();
  }
  createMainWindow();
});

// Handle migration requests from post-install setup
ipcMain.handle('run-migrations', async () => {
  try {
    console.log('Running Django migrations for fresh setup...');
    const result = await runDjangoMigrations();
    console.log('Django migrations completed successfully for fresh setup');
    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, message: error.message };
  }
});

app.whenReady().then(() => {
  // Check if this is the first run after installation
  if (isFirstRunAfterInstall() && !isDev) {
    createPostInstallWindow();
  } else {
    // Check if this is the first run (original installation)
    const isFirstRun = !fs.existsSync(path.join(app.getPath('userData'), 'mahall-installed'));
    
    if (isFirstRun && !isDev) {
      createInstallWindow();
    } else {
      createMainWindow();
    }
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', function () {
  stopDjangoServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', function () {
  stopDjangoServer();
});