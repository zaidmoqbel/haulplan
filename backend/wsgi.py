import os
from pathlib import Path
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
application = WhiteNoise(get_wsgi_application())
assets = Path(__file__).resolve().parent.parent / "frontend" / "dist" / "assets"
if assets.exists():
    application.add_files(assets, prefix="assets/")
