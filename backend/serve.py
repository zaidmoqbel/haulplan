import os
from waitress import serve
from wsgi import application

if __name__ == "__main__":
    # Render terminates TLS at its edge; tell Django that incoming public requests
    # use HTTPS without trusting arbitrary client-supplied forwarding headers.
    serve(application, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")), threads=4,
          url_scheme="https" if os.environ.get("RENDER") == "true" else "http")
