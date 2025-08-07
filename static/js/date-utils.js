// 日期工具函数
window.DateUtils = {
    getTimeRange(startHour, endHour) {
        const hours = [];
        if (startHour <= endHour) {
            for (let hour = startHour; hour <= endHour; hour++) {
                hours.push(hour);
            }
        } else {
            for (let hour = startHour; hour <= 23; hour++) {
                hours.push(hour);
            }
            for (let hour = 0; hour <= endHour; hour++) {
                hours.push(hour);
            }
        }
        return hours;
    },

    getTimeFromY(y, containerHeight, timeSettings) {
        const timeRange = this.getTimeRange(timeSettings.startHour, timeSettings.endHour);
        const hourHeight = containerHeight / timeRange.length;
        const totalMinutes = (y / hourHeight) * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round((totalMinutes % 60) / 5) * 5;
        
        const actualHour = timeRange[Math.min(hours, timeRange.length - 1)] || timeRange[0];
        const adjustedMinutes = Math.min(minutes, 59);
        
        return `${actualHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
    },

    getDaysInMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({ date: prevDate, isCurrentMonth: false });
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ date: new Date(year, month, day), isCurrentMonth: true });
        }
        
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
        }
        
        return days;
    },

    generateRepeatEvents(formData) {
        const events = [];
        const startDate = new Date(formData.date);
        const endDate = formData.repeatEnd ? new Date(formData.repeatEnd) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        
        let currentDate = new Date(startDate);
        let count = 0;
        const maxEvents = 100;
        
        while (currentDate <= endDate && count < maxEvents) {
            events.push({
                ...formData,
                id: Date.now() + count,
                date: currentDate.toISOString().split('T')[0],
                repeat: 'none'
            });
            
            switch (formData.repeat) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                default:
                    break;
            }
            count++;
        }
        
        return events;
    }
};