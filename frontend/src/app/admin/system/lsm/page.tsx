import React from 'react';
import LsmClient from './LsmClient';
import { leaderScheduleAdminService } from '@/services/foundation/system/LeaderScheduleAdminService';

export default async function LsmPage() {
    let schedules = [];
    let statuses = [];

    try {
        const scheduleRes = await leaderScheduleAdminService.getLeaderScheduleList();
        schedules = scheduleRes.list || [];

        const statusRes = await leaderScheduleAdminService.getLeaderStatusList();
        statuses = statusRes.list || [];
    } catch (error) {
        console.error('LSM Data Fetch Error:', error);
    }

    return <LsmClient initialSchedules={schedules} initialStatuses={statuses} />;
}
