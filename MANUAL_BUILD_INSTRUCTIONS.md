# Manual Build Instructions (Administrator)

Follow these steps to build the installer manually. This requires Administrator privileges to allow the build tool to create necessary symbolic links.

### 1. Open Command Prompt as Administrator
1. Press the **Windows Key** on your keyboard.
2. Type **`cmd`**.
3. In the search results, right-click on **Command Prompt**.
4. Select **Run as administrator**.
5. Click **Yes** if asked for permission.

### 2. Run Build Commands
Copy and paste the following commands into the Administrator Command Prompt one by one (or all at once):

```cmd
:: 1. Go to the frontend directory
cd /d "d:\work\mahall\mahali\frontend"

:: 2. Clean previous failed build folder (optional but recommended)
rmdir /s /q "dist-electron"

:: 3. Run the Electron Builder
npm run build-electron
```

### 3. Check Results
Once the command finishes successfully, your installer (`.exe` file) will be located here:
`d:\work\mahall\mahali\frontend\dist-electron\`
