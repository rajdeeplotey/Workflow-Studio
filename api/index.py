# api/index.py - Vercel Serverless Entry Point for FastAPI Backend
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
