import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let djangoProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  if (process.env.NODE_ENV === 'dev') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

function startDjangoServer() {
  const djangoExePath = path.join(process.resourcesPath, 'backend', 'django_server.exe');
  const djangoDir = path.join(process.resourcesPath, 'backend');

  if (process.env.NODE_ENV === 'dev') {
    // In development, use the Django dev server
    djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8000'], {
      cwd: path.join(process.cwd(), 'backend'),
      stdio: 'pipe'
    });

    // Log Django server output
    if (djangoProcess.stdout) {
      djangoProcess.stdout.on('data', (data) => {
        console.log(`Django: ${data}`);
      });
    }

    if (djangoProcess.stderr) {
      djangoProcess.stderr.on('data', (data) => {
        console.error(`Django Error: ${data}`);
      });
    }
  } else {
    // In production, spawn the .exe
    djangoProcess = spawn(djangoExePath, [], {
      cwd: djangoDir,
      stdio: 'inherit'
    });

    // Log Django process events for debugging
    djangoProcess.on('error', (err) => {
      console.error('Django server failed to start:', err);
    });

    djangoProcess.on('close', (code) => {
      console.log(`Django server exited with code ${code}`);
    });
  }
}

app.whenReady().then(() => {
  startDjangoServer();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
});

app.on('window-all-closed', function () {
  if (djangoProcess) {
    djangoProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit()
});
