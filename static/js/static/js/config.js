// 日历配置文件 - 使用podcast的Cloudinary数据
window.CALENDAR_CONFIG = {
    // 使用podcast的Cloudinary配置
    CLOUDINARY: {
        cloud_name: "dxm0ajjil",
        api_key: "286612799875297",
        upload_preset: "podcast_upload"
    },
    
    // API端点 - 指向本地planner应用
    API: {
        base_url: window.location.origin,
        get_events: '/api/calendar/events',
        save_events: '/api/calendar/events'
    },
    
    // 默认事件
    DEFAULT_EVENTS: [
        {
            id: 1,
            title: '播客录制',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            endTime: '10:30',
            location: '录音室',
            notes: '第10期节目录制'
        },
        {
            id: 2,
            title: '内容策划会议',
            date: new Date().toISOString().split('T')[0],
            time: '14:00',
            endTime: '15:00',
            location: '办公室',
            notes: '下期节目主题讨论'
        }
    ],
    
    // UI文本
    UI_TEXT: {
        monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    }
};
