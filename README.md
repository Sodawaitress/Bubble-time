# BW Calendar v2.1 (Flask + React UI)

- Fault-tolerant storage: uses Cloudinary if env provided, otherwise falls back to local JSON under ./storage
- Adds /status endpoint to verify env quickly
- Includes requests in requirements
- React/Tailwind black-and-white UI
- Email/password auth, recurring events, EXDATE delete-one

## Run
pip install -r requirements.txt
cp .env.example .env  # fill envs or leave blank to use local storage
python app.py

Open http://127.0.0.1:5000
