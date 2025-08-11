import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

APP_DIR = Path(__file__).resolve().parent
STORAGE_PATH = APP_DIR / "storage.json"
ENV_PATH = APP_DIR / ".env"

# --- simple .env loader (no dependency needed) ---
def load_env_file(path: Path):
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env_file(ENV_PATH)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "ChangeMeAdminToken")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()

# --- Models ---
class Announcement(BaseModel):
    id: Optional[int] = Field(None, description="Auto-assigned on create")
    title: str = Field(..., min_length=1, max_length=120)
    message: str = Field(..., min_length=1, max_length=4000)
    startDate: datetime
    endDate: datetime
    notifyAt: Optional[datetime] = None
    priority: int = Field(10, ge=1, le=100)
    active: bool = True
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    createdBy: Optional[str] = None

@field_validator("endDate")
@classmethod
def end_after_start(cls, v, info):
    start = info.data.get("startDate")
    if start and v <= start:
        raise ValueError("endDate must be after startDate")
    return v

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    startDate: datetime
    endDate: datetime
    notifyAt: Optional[datetime] = None
    priority: int = 10
    active: bool = True
    createdBy: Optional[str] = None

class BellBlock(BaseModel):
    name: str
    start: str  # "07:50"
    end: str    # "08:40"

class BellSchedule(BaseModel):
    day: str          # e.g., "Regular"
    blocks: List[BellBlock]

# --- Storage helpers ---
DEFAULT_STORAGE = {
    "announcements": [],
    "next_id": 1,
    "bell_schedules": [
        {
            "day": "Regular Day",
            "blocks": [
                {"name": "Period 1", "start": "08:30", "end": "09:20"},
                {"name": "Period 2", "start": "09:25", "end": "10:15"},
                {"name": "Break",    "start": "10:15", "end": "10:25"},
                {"name": "Period 3", "start": "10:30", "end": "11:20"},
                {"name": "Period 4", "start": "11:25", "end": "12:15"},
                {"name": "Lunch",    "start": "12:15", "end": "12:55"},
                {"name": "Period 5", "start": "13:00", "end": "13:50"},
                {"name": "Period 6", "start": "13:55", "end": "14:45"},
            ],
        },
        {
            "day": "Wednesday (Late Start)",
            "blocks": [
                {"name": "Period 1", "start": "09:30", "end": "10:10"},
                {"name": "Period 2", "start": "10:15", "end": "10:55"},
                {"name": "Period 3", "start": "11:00", "end": "11:40"},
                {"name": "Lunch",    "start": "11:40", "end": "12:20"},
                {"name": "Period 4", "start": "12:25", "end": "13:05"},
                {"name": "Period 5", "start": "13:10", "end": "13:50"},
                {"name": "Period 6", "start": "13:55", "end": "14:35"},
            ],
        },
    ],
}

def read_store():
    if not STORAGE_PATH.exists():
        STORAGE_PATH.write_text(json.dumps(DEFAULT_STORAGE, indent=2))
    return json.loads(STORAGE_PATH.read_text())

def write_store(data):
    STORAGE_PATH.write_text(json.dumps(data, indent=2, default=str))

# --- App ---
app = FastAPI(title="EHS Announcements API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health
@app.get("/health")
def health():
    return {"status": "ok", "time": utcnow_iso()}

# Bell schedules
@app.get("/bell-schedule", response_model=List[BellSchedule])
def get_bell_schedule():
    store = read_store()
    return store["bell_schedules"]

# Announcements
@app.get("/announcements", response_model=List[Announcement])
def list_announcements(active_only: bool = True):
    store = read_store()
    items = store["announcements"]
    if active_only:
        now = datetime.now(timezone.utc)
        items = [
            a for a in items
            if a.get("active", True)
            and datetime.fromisoformat(a["startDate"]) <= now <= datetime.fromisoformat(a["endDate"])
            and (not a.get("notifyAt") or datetime.fromisoformat(a["notifyAt"]) <= now)
        ]
    # sort by priority desc then startDate desc
    items.sort(key=lambda a: (-int(a.get("priority", 10)), a.get("startDate", "")), reverse=True)
    return items

@app.post("/announcements", response_model=Announcement, status_code=201)
def create_announcement(payload: AnnouncementCreate, x_admin_token: Optional[str] = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    store = read_store()
    new_id = store.get("next_id", 1)
    now = utcnow_iso()
    ann = Announcement(
        id=new_id,
        createdAt=now,
        updatedAt=now,
        **payload.dict(),
    )
    store["announcements"].append(json.loads(ann.json()))
    store["next_id"] = new_id + 1
    write_store(store)
    return ann
