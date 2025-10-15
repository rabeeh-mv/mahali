# Mahall Society Management System

A comprehensive society management application built with Django (backend) and React (frontend) for managing members, houses, areas, collections, subcollections, and member obligations.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- Member management with detailed information
- House and area management
- Collection and subcollection system for payments
- Member obligation tracking
- Data export/import functionality
- Modern UI with light, dim, and dark themes
- Responsive design for all device sizes
- Hierarchical data navigation
- Comprehensive data models:
  - **Area**: Geographic areas for organizing houses
  - **House**: Individual houses with family information
  - **Member**: Society members with personal details
  - **Collection**: Payment categories (e.g., maintenance, events)
  - **SubCollection**: Yearly payment subcategories
  - **MemberObligation**: Individual member payment obligations

## Tech Stack

### Backend
- **Django** 5.2.5
- **Django REST Framework** 3.16.1
- **Python** 3.12+
- **SQLite** (default database)

### Frontend
- **React** 19.1.1
- **Vite** 6.0.1
- **Electron** 33.2.1
- **Axios** 1.12.2

### Development Tools
- **Node.js** 18.17.0+
- **npm** 9.6.7+

## Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.12 or higher
- Node.js 18.17.0 or higher
- npm 9.6.7 or higher
- Git

## Installation

### Quick Setup (Windows)

For Windows users, you can use the provided setup script:

```bash
setup.bat
```

This script will automatically:
- Create a virtual environment
- Install all dependencies
- Set up the database
- Create a superuser
- Start both backend and frontend servers

### Backend Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Mahall Software"
   ```

2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

4. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

5. Install Python dependencies:
   ```bash
   pip install Django==5.2.5
   pip install djangorestframework==3.16.1
   pip install django-cors-headers==4.7.0
   pip install pillow==11.3.0
   ```

   Or install all dependencies at once:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. (Optional) Build the frontend for production:
   ```bash
   npm run build
   ```

## Environment Variables

Create a `.env` file in the backend directory based on the `.env.sample` file:

```bash
cp .env.sample .env
```

### Backend Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| DEBUG | Debug mode | True |
| SECRET_KEY | Django secret key | (auto-generated) |
| DATABASE_URL | Database connection URL | sqlite:///db.sqlite3 |
| ALLOWED_HOSTS | Comma-separated list of allowed hosts | * |

### Frontend Environment Variables

Create a `.env` file in the frontend directory:

```bash
cp .env.sample .env
```

| Variable | Description | Default Value |
|----------|-------------|---------------|
| VITE_API_URL | Backend API URL | http://127.0.0.1:8000/api |

## Database Setup

1. Make sure you're in the backend directory and virtual environment is activated.

2. Run database migrations:
   ```bash
   python manage.py migrate
   ```

3. (Optional) Create a superuser for admin access:
   ```bash
   python manage.py createsuperuser
   ```

4. (Optional) Load initial data:
   ```bash
   python manage.py loaddata initial_data.json
   ```

### Database Models

The application uses the following database models:

- **Area**: Geographic areas that contain houses
- **House**: Individual houses with family information
- **Member**: Society members with personal details
- **Collection**: Payment categories (e.g., maintenance, events)
- **SubCollection**: Yearly payment subcategories under collections
- **MemberObligation**: Individual member payment obligations linked to subcollections

All models include automatic ID generation starting from 1001 and proper relationships between entities.

## Running the Application

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Activate the virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

   The backend API will be available at: http://127.0.0.1:8000/

The Django admin interface will be available at: http://127.0.0.1:8000/admin/
(Requires superuser account created during setup)

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at: http://localhost:5173/

The frontend development server includes hot reloading for instant preview of changes.

### Running as Desktop Application (Electron)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Run the Electron application:
   ```bash
   npm run electron
   ```

## Project Structure

```
Mahall Software/
├── backend/
│   ├── mahall_backend/         # Django project settings
│   ├── society/                # Main Django app
│   │   ├── migrations/         # Database migrations
│   │   ├── models.py           # Data models
│   │   ├── serializers.py      # API serializers
│   │   ├── views.py            # API views
│   │   ├── urls.py             # API URL routing
│   │   └── admin.py            # Admin interface configuration
│   ├── manage.py               # Django management script
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── api.js              # API client
│   │   ├── App.css             # Main styles
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global styles
│   ├── package.json            # Node.js dependencies
│   └── vite.config.js          # Vite configuration
├── README.md                   # This file
├── .env.sample                 # Sample environment variables
├── .gitignore                  # Git ignore rules
└── LICENSE                     # License information
```

## API Documentation

The API documentation is available at: http://127.0.0.1:8000/api/docs/ (when running)

### Main Endpoints

- **Members**: `/api/members/`
- **Houses**: `/api/houses/`
- **Areas**: `/api/areas/`
- **Collections**: `/api/collections/`
- **Subcollections**: `/api/subcollections/`
- **Member Obligations**: `/api/obligations/`

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - The development servers will automatically try different ports
   - Check terminal output for the actual URL

2. **Database migration errors**:
   ```bash
   python manage.py migrate --run-syncdb
   ```

3. **Missing dependencies**:
   ```bash
   pip install -r requirements.txt
   npm install
   ```

4. **Frontend not connecting to backend**:
   - Ensure backend server is running
   - Check VITE_API_URL in frontend .env file

### Clearing Cache

To clear all caches and start fresh:

```bash
# Backend
python manage.py collectstatic --noinput

# Frontend
delete node_modules/ and package-lock.json
npm install
```

## Contributing

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/YourFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeature
   ```
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.