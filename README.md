# BW Calendar (Flask + FullCalendar + Cloudinary)

一个全黑白 UI 的在线日历（Day / 3 Days / 7 Days / Month），支持 5 分钟粒度、拖拽创建/移动/缩放、每天/每周重复、删除单次实例（EXDATE），并支持用户登录（邮箱+密码）。数据保存在 Cloudinary RAW JSON 中（每个用户独立文件）。

## 本地运行

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # 并填好 SECRET_KEY (可留空) 和 Cloudinary 三个变量
python app.py
```

访问 http://127.0.0.1:5000

## Railway 部署

1. 将此项目推到你的 GitHub 仓库（或 Fork 我的仓库）。
2. Railway 新建项目 -> 选择该仓库。
3. 在 Railway 项目 Settings -> Variables 添加：
   - SECRET_KEY
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
4. 部署完成后，打开域名即可使用。
