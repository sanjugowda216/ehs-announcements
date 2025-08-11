# ehs-announcements
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -U pip
pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env if you want to change token or allowed origins
# ADMIN_TOKEN is used for the Admin page POST requests
# ALLOWED_ORIGINS must include your frontend's URL (default is vite dev server)
cat backend/.env
# ADMIN_TOKEN=EhsAnnouncePortal
# ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Run the backend API
uvicorn app:app --reload --host 127.0.0.1 --port 8000


# FRONTEND SETUP
cd frontend

# Install dependencies
npm install

# Create a .env file for frontend
echo "VITE_API_URL=http://127.0.0.1:8000" > .env
# Optional: prefill admin token
echo "VITE_ADMIN_TOKEN=EhsAnnouncePortal" >> .env

# Start Vite dev server
npm run dev

# TESTING WITH CURL
curl -X POST http://127.0.0.1:8000/announcements \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: EhsAnnouncePortal" \
  -d '{
    "title":"Welcome Back",
    "message":"School starts Monday!",
    "startDate":"2025-08-11T07:00:00Z",
    "endDate":"2025-08-12T23:59:59Z",
    "notifyAt":null,
    "priority":10,
    "active":true,
    "createdBy":"Admin"
  }'