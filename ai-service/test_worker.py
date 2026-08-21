import sys
import os

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.workers.carousel_worker import start_worker
    print("Worker import successful")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("Worker import failed:", e)
