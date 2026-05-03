import React from 'react';
import LsmClient from './LsmClient';
import { leaderScheduleAdminService, LeaderSchedule, LeaderStatus } from '@/services/foundation/system/LeaderScheduleAdminService';

export default async function LsmPage() {
    let schedules: LeaderSchedule[] = [];
    let statuses: LeaderStatus[] = [];

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
