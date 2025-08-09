from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__)

EVENTS_FILE = "events.json"

# 确保 events.json 存在
if not os.path.exists(EVENTS_FILE):
    with open(EVENTS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

def read_events():
    with open(EVENTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_events(events):
    with open(EVENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

@app.route("/")
def home():
    return render_template("index.html", title="Calendar")

@app.route("/api/events", methods=["GET"])
def get_events():
    return jsonify({"success": True, "data": read_events()})

@app.route("/api/events", methods=["POST"])
def create_event():
    events = read_events()
    data = request.get_json()

    # 自动对齐到 5 分钟
    start_dt = datetime.fromisoformat(data["start"])
    end_dt = datetime.fromisoformat(data["end"])

    if (end_dt - start_dt).total_seconds() < 300:
        end_dt = start_dt + timedelta(minutes=5)

    # 格式化为 ISO
    event = {
        "id": len(events) + 1,
        "title": data.get("title", "Untitled Event"),
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat()
    }
    events.append(event)
    write_events(events)
    return jsonify({"success": True, "data": event})

@app.route("/api/events/<int:event_id>", methods=["PUT"])
def update_event(event_id):
    events = read_events()
    data = request.get_json()
    for e in events:
        if e["id"] == event_id:
            e["title"] = data.get("title", e["title"])
            e["start"] = data.get("start", e["start"])
            e["end"] = data.get("end", e["end"])
            write_events(events)
            return jsonify({"success": True, "data": e})
    return jsonify({"success": False, "error": "Event not found"}), 404

@app.route("/api/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    events = read_events()
    new_events = [e for e in events if e["id"] != event_id]
    if len(new_events) == len(events):
        return jsonify({"success": False, "error": "Event not found"}), 404
    write_events(new_events)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)
