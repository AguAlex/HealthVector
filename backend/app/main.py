from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, leaflets, medications, chat
from app.services.indexer_service import LeafletIndexerService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Rulează la pornirea aplicației
    try:
        await LeafletIndexerService.index_unindexed_leaflets()
    except Exception as e:
        print(f"Atenție: Indexarea inițială a eșuat sau cheia API nu este setată: {e}")
    yield

app = FastAPI(
    title="Patient Medication Assistant Backend API",
    version="2.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leaflets.router)
app.include_router(medications.router)
app.include_router(chat.router)