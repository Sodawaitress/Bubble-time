from flask import Flask, send_from_directory, jsonify, request, session, redirect, url_for, render_template
import os
import json
import base64
from datetime import datetime
import functools

# 尝试导入requests和cloudinary
try:
    import requests
    requests_available = True
except ImportError:
    requests_available = False
    print("警告: requests模块未找到")

try:
    import cloudinary
    import cloudinary.uploader
    cloudinary_available = True
except ImportError:
    cloudinary_available = False
    print("警告: Cloudinary模块未找到")

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config['SECRET_KEY'] = 'planner_secret_key_2025'

# 使用你podcast的Cloudinary配置
if cloudinary_available:
    cloudinary.config( 
        cloud_name = "dxm0ajjil",
        api_key = "286612799875297", 
        api_secret = "EkrlSu4mv50B9Aclc_a4US3ZdX4" 
    )

# 简单的管理员密码
ADMIN_PASSWORD = "planner2025"

# 登录装饰器
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not session.get('authenticated'):
            return redirect(url_for('admin_login'))
        return view(**kwargs)
    return wrapped_view

# 主页 - 直接显示日历
@app.route('/')
def index():
    return send_from_directory('static', 'calendar.html')

# 日历页面
@app.route('/calendar')
@app.route('/calendar.html')
def calendar():
    return send_from_directory('static', 'calendar.html')

# 管理员登录
@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        if request.form.get('password') == ADMIN_PASSWORD:
            session['authenticated'] = True
            return redirect(url_for('index'))
        else:
            return "密码错误", 401
    
    return '''
    <html>
    <body style="font-family: Arial; max-width: 400px; margin: 100px auto; padding: 20px;">
        <h2>日历管理员登录</h2>
        <form method="post">
            <input type="password" name="password" placeholder="请输入密码" 
                   style="width: 100%; padding: 10px; margin: 10px 0; border: 2px solid black;">
            <button type="submit" style="width: 100%; padding: 10px; background: black; color: white; border: none;">
                登录
            </button>
        </form>
    </body>
    </html>
    '''

# API: 获取日历数据
@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events():
    """从Cloudinary获取日历数据"""
    try:
        if cloudinary_available and requests_available:
            # 尝试获取日历数据
            url = cloudinary.utils.cloudinary_url("calendar_data", resource_type="raw")[0]
            response = requests.get(url)
            if response.status_code == 200:
                data = json.loads(response.text)
                return jsonify(data)
        
        # 返回默认数据
        return jsonify({
            "events": [
                {
                    "id": 1,
                    "title": "播客录制",
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "time": "09:00",
                    "endTime": "10:30",
                    "location": "录音室",
                    "notes": "第10期节目录制"
                }
            ],
            "timeSettings": {"startHour": 6, "endHour": 22}
        })
    except Exception as e:
        print(f"获取日历数据出错: {e}")
        return jsonify({"events": [], "timeSettings": {"startHour": 6, "endHour": 22}}), 500

# API: 保存日历数据
@app.route('/api/calendar/events', methods=['POST'])
@login_required
def save_calendar_events():
    """保存日历数据到Cloudinary"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "无效的数据"}), 400
        
        if cloudinary_available:
            # 添加最后更新时间
            data['lastUpdated'] = datetime.now().isoformat()
            
            # 转换为JSON字符串并上传到Cloudinary
            data_json = json.dumps(data, ensure_ascii=False)
            result = cloudinary.uploader.upload(
                "data:application/json;base64," + base64.b64encode(data_json.encode('utf-8')).decode('utf-8'),
                resource_type="raw",
                public_id="calendar_data",
                overwrite=True
            )
            
            if result.get('secure_url'):
                return jsonify({
                    "success": True, 
                    "message": "日历数据已保存",
                    "url": result.get('secure_url')
                })
        
        return jsonify({"success": False, "message": "Cloudinary不可用"}), 500
        
    except Exception as e:
        print(f"保存日历数据出错: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# 状态检查
@app.route('/status')
def status():
    return jsonify({
        "app": "独立日历计划器",
        "cloudinary_available": cloudinary_available,
        "requests_available": requests_available,
        "authenticated": session.get('authenticated', False),
        "cloudinary_config": {
            "cloud_name": "dxm0ajjil",
            "upload_preset": "podcast_upload"
        }
    })

# 登出
@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # 使用不同的端口避免冲突