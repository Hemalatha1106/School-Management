# School Management System Backend

This is the backend for the School Management System, built with Django and Django REST Framework.

## Features
- Student, Teacher, and User Management
- Fee Structure and Management
- Timetable Management
- Leave Management
- RESTful API endpoints

## Getting Started

### Prerequisites
- Python 3.8+
- Django
- Django REST Framework

### Installation
1. Clone the repository:
   ```
   git clone <repo-url>
   ```
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run migrations:
   ```
   python manage.py migrate
   ```
4. Start the server:
   ```
   python manage.py runserver
   ```

## API Documentation
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for details on available endpoints.

## Project Structure
- `school_management/` — Django project root
- `school_management/api/` — API endpoints and logic
- `db.sqlite3` — Default database
- `requirements.txt` — Python dependencies

## License
MIT
