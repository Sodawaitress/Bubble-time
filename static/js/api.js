// API工具 - 通过planner应用访问podcast的Cloudinary数据
window.CalendarAPI = {
    // 从服务器加载数据
    async loadData() {
        try {
            const response = await fetch(window.CALENDAR_CONFIG.API.base_url + window.CALENDAR_CONFIG.API.get_events);
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                throw new Error('加载失败');
            }
        } catch (error) {
            console.error('加载数据错误:', error);
            return { 
                success: false, 
                error: error.message,
                data: {
                    events: window.CALENDAR_CONFIG.DEFAULT_EVENTS,
                    timeSettings: { startHour: 6, endHour: 22 }
                }
            };
        }
    },

    // 保存数据到服务器
    async saveData(events, timeSettings) {
        try {
            const dataToSave = {
                events: events,
                timeSettings: timeSettings
            };
            
            const response = await fetch(window.CALENDAR_CONFIG.API.base_url + window.CALENDAR_CONFIG.API.save_events, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave)
            });
            
            const result = await response.json();
            
            if (result.success) {
                return { success: true, message: result.message };
            } else {
                throw new Error(result.message || '保存失败');
            }
        } catch (error) {
            console.error('保存数据错误:', error);
            return { success: false, error: error.message };
        }
    },

    // 直接从Cloudinary加载（备用方法）
    async loadFromCloudinary() {
        try {
            const url = `https://res.cloudinary.com/${window.CALENDAR_CONFIG.CLOUDINARY.cloud_name}/raw/upload/calendar_data.json`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                throw new Error('数据不存在');
            }
        } catch (error) {
            console.log('首次使用或数据不存在，使用默认数据');
            return { 
                success: false, 
                error: error.message,
                data: {
                    events: window.CALENDAR_CONFIG.DEFAULT_EVENTS,
                    timeSettings: { startHour: 6, endHour: 22 }
                }
            };
        }
    },

    // 直接保存到Cloudinary（备用方法）
    async saveToCloudinary(events, timeSettings) {
        try {
            const dataToSave = {
                events: events,
                timeSettings: timeSettings,
                lastUpdated: new Date().toISOString()
            };
            
            const jsonString = JSON.stringify(dataToSave, null, 2);
            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            
            const formData = new FormData();
            formData.append('file', `data:application/json;base64,${base64Data}`);
            formData.append('upload_preset', window.CALENDAR_CONFIG.CLOUDINARY.upload_preset);
            formData.append('public_id', 'calendar_data');
            formData.append('resource_type', 'raw');
            formData.append('overwrite', 'true');
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${window.CALENDAR_CONFIG.CLOUDINARY.cloud_name}/raw/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (response.ok) {
                return { success: true, message: '数据已保存到云端' };
            } else {
                throw new Error('保存失败');
            }
        } catch (error) {
            console.error('保存错误:', error);
            return { success: false, error: error.message };
        }
    }
};