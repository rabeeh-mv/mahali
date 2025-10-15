const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  try {
    console.log('Running afterPack script to copy backend files...');

    const { appOutDir } = context;

    // Source backend directory
    const backendSource = path.join(process.cwd(), '..', 'backend');
    const backendTarget = path.join(appOutDir, 'backend');

    console.log(`Source: ${backendSource}`);
    console.log(`Target: ${backendTarget}`);

    // Create backend directory if it doesn't exist
    if (!fs.existsSync(backendTarget)) {
      fs.mkdirSync(backendTarget, { recursive: true });
    }

    // Copy essential backend files
    const filesToCopy = [
      'db.sqlite3',
      'django_server.exe'
    ];

    filesToCopy.forEach(file => {
      const srcPath = path.join(backendSource, file);
      const destPath = path.join(backendTarget, file);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${file}`);
      } else {
        console.log(`Source file not found: ${srcPath}`);
      }
    });

    // Check if media directory exists and copy it
    const mediaSource = path.join(backendSource, 'media');
    const mediaTarget = path.join(backendTarget, 'media');

    if (fs.existsSync(mediaSource)) {
      copyDirectoryRecursive(mediaSource, mediaTarget);
      console.log('Copied: media directory');
    }

    console.log('Backend files copied successfully!');
  } catch (error) {
    console.error('Error in afterPack script:', error);
    throw error;
  }
};

function copyDirectoryRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
