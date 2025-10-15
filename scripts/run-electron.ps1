# PowerShell script to run Electron with NODE_ENV=dev
$env:NODE_ENV = "dev"
Set-Location frontend
npm run electron
