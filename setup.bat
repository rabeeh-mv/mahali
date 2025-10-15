@echo off
echo Mahall Society Management System - Setup Script
echo =================================================

echo Creating backend virtual environment...
cd backend
python -m venv venv
echo Virtual environment created.

echo Activating virtual environment...
call venv\Scripts\activate.bat
echo Virtual environment activated.

echo Installing Python dependencies...
pip install -r requirements.txt
echo Python dependencies installed.

echo Setting up database...
python manage.py migrate
echo Database setup complete.

echo Creating superuser (you will be prompted for details)...
python manage.py createsuperuser
echo Superuser created.

echo Starting backend server...
start "" python manage.py runserver

cd ..
echo Setting up frontend...
cd frontend
echo Installing Node.js dependencies...
npm install
echo Node.js dependencies installed.

echo Starting frontend development server...
start "" npm run dev

echo Setup complete!
echo Backend is running at http://127.0.0.1:8000/
echo Frontend is running at http://localhost:5173/
echo Press any key to exit...
pause >nul