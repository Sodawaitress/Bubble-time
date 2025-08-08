
import os
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from dateutil.rrule import rrule, DAILY, WEEKLY
from dateutil import tz
import bcrypt
import json, base64, secrets

# Optional Cloudinary
USE_CLOUD = all([
    os.environ.get("CLOUDINARY_CLOUD_NAME"),
    os.environ.get("CLOUDINARY_API_KEY"),
    os.environ.get("CLOUDINARY_API_SECRET"),
])

if USE_CLOUD:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    )

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(16)

# ---------- Storage Layer (Cloudinary or Local JSON) ----------

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

def _cloud_upload(public_id: str, data: dict):
    import cloudinary.uploader, cloudinary.utils
    payload = json.dumps(data, ensure_ascii=False)
    return cloudinary.uploader.upload(
        "data:application/json;base64," + base64.b64encode(payload.encode("utf-8")).decode("utf-8"),
        resource_type="raw",
        public_id=public_id,
        overwrite=True,
    )

def _cloud_download(public_id: str):
    try:
        import requests, cloudinary.utils
        url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type="raw")
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200 and resp.text.strip():
            return json.loads(resp.text)
    except Exception:
        pass
    return None

def _local_path(name: str):
    return os.path.join(STORAGE_DIR, f"{name}.json")

def _local_write(name: str, data: dict):
    with open(_local_path(name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def _local_read(name: str):
    p = _local_path(name)
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def _save(name: str, data: dict):
    if USE_CLOUD:
        try:
            _cloud_upload(name, data)
            return
        except Exception as e:
            # Fallback to local if cloud fails
            pass
    _local_write(name, data)

def _load(name: str):
    if USE_CLOUD:
        try:
            data = _cloud_download(name)
            if data is not None:
                return data
        except Exception:
            pass
    local = _local_read(name)
    return local

def load_users():
    data = _load("calendar_users")
    if not data:
        data = {"users":[]}
        _save("calendar_users", data)
    return data

def save_users(data):
    _save("calendar_users", data)

def ensure_user_events(user_id: str):
    key = f"events_{user_id}"
    data = _load(key)
    if not data:
        data = {"events": [], "exdates": []}
        _save(key, data)
    return data

def save_user_events(user_id: str, data):
    _save(f"events_{user_id}", data)

# ---------- Helpers ----------

def current_user():
    return session.get("user")

def login_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return redirect(url_for("login"))
        return fn(*args, **kwargs)
    return wrapper

# ---------- Routes ----------

@app.route("/")
def home():
    return render_template("index.html", title="Calendar")

@app.route("/status")
def status():
    return jsonify({
        "ok": True,
        "use_cloudinary": USE_CLOUD,
        "has_cloud_name": bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
        "has_api_key": bool(os.environ.get("CLOUDINARY_API_KEY")),
        "has_api_secret": bool(os.environ.get("CLOUDINARY_API_SECRET")),
        "storage_path": os.path.abspath(STORAGE_DIR),
        "user": bool(current_user())
    })

@app.route("/register", methods=["GET","POST"])
def register():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        pw = request.form.get("password","")
        if not email or not pw:
            flash("缺少邮箱或密码")
            return redirect(url_for("register"))
        users = load_users()
        if any(u["email"]==email for u in users["users"]):
            flash("该邮箱已注册")
            return redirect(url_for("login"))
        hashed = bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = {
            "id": secrets.token_hex(8),
            "email": email,
            "password": hashed,
            "timezone": "Asia/Shanghai",
            "dayStart": "07:40",
            "dayEnd": "22:00",
            "slotGranularity": 5,
        }
        users["users"].append(user)
        save_users(users)
        session["user"] = {k:v for k,v in user.items() if k!="password"}
        return redirect(url_for("home"))
    return render_template("login.html", title="注册").replace("登录","注册")

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        pw = request.form.get("password","")
        users = load_users()
        found = next((u for u in users["users"] if u["email"]==email), None)
        if not found:
            flash("用户不存在")
            return redirect(url_for("login"))
        if not bcrypt.checkpw(pw.encode("utf-8"), found["password"].encode("utf-8")):
            flash("密码不正确")
            return redirect(url_for("login"))
        session["user"] = {k:v for k,v in found.items() if k!="password"}
        return redirect(url_for("home"))
    return render_template("login.html", title="登录")

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("home"))

# Settings page is optional in this pared-down version; UI handles time window locally.
# Left implemented if user navigates to /settings accidentally.
@app.route("/settings", methods=["GET","POST"])
@login_required
def settings():
    u = current_user()
    if request.method == "POST":
        users = load_users()
        idx = next(i for i,x in enumerate(users["users"]) if x["id"]==u["id"])
        users["users"][idx]["timezone"] = request.form.get("timezone") or "Asia/Shanghai"
        users["users"][idx]["dayStart"] = request.form.get("dayStart") or "07:40"
        users["users"][idx]["dayEnd"] = request.form.get("dayEnd") or "22:00"
        users["users"][idx]["slotGranularity"] = int(request.form.get("slotGranularity") or 5)
        save_users(users)
        session["user"] = {k:v for k,v in users["users"][idx].items() if k!="password"}
        flash("设置已保存")
        return redirect(url_for("settings"))
    users = load_users()
    fresh = next(x for x in users["users"] if x["id"]==u["id"])
    class Obj: pass
    o = Obj()
    o.__dict__.update({k:v for k,v in fresh.items() if k!="password"})
    return render_template("login.html", title="设置（占位）")

# ---------- Events API ----------

def expand_events(evts, exdates, start_iso, end_iso, tzname):
    start = datetime.fromisoformat(start_iso.replace("Z","+00:00"))
    end = datetime.fromisoformat(end_iso.replace("Z","+00:00"))
    out = []
    exset = set(exdates or [])
    for e in evts:
        base = {
            "id": e["id"],
            "title": e.get("title",""),
            "notes": e.get("notes",""),
        }
        r = e.get("rrule")
        if r:
            freq = r.get("freq")
            dtstart = datetime.fromisoformat(r.get("dtstart").replace("Z","+00:00"))
            until = end
            interval = 1
            if freq == "DAILY":
                from dateutil.rrule import DAILY as FREQ
            elif freq == "WEEKLY":
                from dateutil.rrule import WEEKLY as FREQ
            else:
                FREQ = None
            duration = datetime.fromisoformat(e["end"].replace("Z","+00:00")) - datetime.fromisoformat(e["start"].replace("Z","+00:00"))
            if FREQ:
                for occ in rrule(FREQ, dtstart=dtstart, until=until, interval=interval):
                    if occ < start or occ >= end:
                        continue
                    occ_iso = occ.isoformat().replace("+00:00","Z")
                    if occ_iso in exset:
                        continue
                    item = dict(base)
                    item["start"] = occ_iso
                    item["end"] = (occ + duration).isoformat().replace("+00:00","Z")
                    item["rrule"] = r
                    out.append(item)
        else:
            s = datetime.fromisoformat(e["start"].replace("Z","+00:00"))
            if s >= start and s < end:
                out.append({**base, "start": e["start"], "end": e["end"]})
    return out

from flask import Response

@app.route("/api/events", methods=["GET","POST"])
@login_required
def api_events():
    u = current_user()
    dataset = ensure_user_events(u["id"])
    if request.method == "GET":
        start = request.args.get("start") or (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
        end = request.args.get("end") or (datetime.utcnow() + timedelta(days=60)).isoformat() + "Z"
        expanded = expand_events(dataset["events"], dataset.get("exdates",[]), start, end, None)
        return jsonify(expanded)
    else:
        data = request.get_json(force=True)
        new_evt = {
            "id": secrets.token_hex(8),
            "title": data.get("title",""),
            "notes": data.get("notes",""),
            "start": data.get("start"),
            "end": data.get("end"),
            "rrule": data.get("rrule"),
        }
        dataset["events"].append(new_evt)
        save_user_events(u["id"], dataset)
        return jsonify({"ok":True, "id": new_evt["id"]}), 201

@app.route("/api/events/<eid>", methods=["PUT","DELETE"])
@login_required
def api_event_item(eid):
    u = current_user()
    dataset = ensure_user_events(u["id"])
    evts = dataset["events"]
    target = next((e for e in evts if e["id"]==eid), None)
    if not target:
        return jsonify({"error":"not found"}), 404
    if request.method == "PUT":
        data = request.get_json(force=True)
        for key in ["title","notes","start","end","rrule"]:
            if key in data and data[key] is not None:
                target[key] = data[key]
        save_user_events(u["id"], dataset)
        return jsonify({"ok":True})
    else:
        exdate = request.args.get("exdate")
        if exdate and target.get("rrule"):
            dataset.setdefault("exdates", []).append(exdate)
        else:
            evts[:] = [e for e in evts if e["id"]!=eid]
        save_user_events(u["id"], dataset)
        return jsonify({"ok":True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
