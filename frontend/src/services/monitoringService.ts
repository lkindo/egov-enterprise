import client from '@/lib/api/client';
import { ServerResourceLog, DbMonitoringLog, ProcessMonitoring } from '@/types/monitoring';

export const monitoringService = {
  /**
   * 서버 자원 로그 조회
   */
  getServerLogs: async (params: { strServerNm?: string; page?: number; size?: number }) => {
    const response = await client.get('/admin/system/monitoring/logs', { params });
    return response.data;
  },

  /**
   * 데이터베이스 모니터링 로그 조회
   */
  getDbLogs: async () => {
    const response = await client.get('/admin/system/monitoring/db/logs');
    return response.data;
  },

  /**
   * 프로세스 모니터링 목록 조회
   */
  getProcesses: async () => {
    const response = await client.get('/admin/system/monitoring/processes');
    return response.data;
  },

  /**
   * 파일시스템 모니터링 목록 조회
   */
  getFileSystemLogs: async () => {
    const response = await client.get('/admin/system/monitoring/filesys/logs');
    return response.data;
  },

  /**
   * HTTP 서비스 응답 모니터링 조회
   */
  getHttpLogs: async () => {
    const response = await client.get('/admin/system/monitoring/http/logs');
    return response.data;
  },

  /**
   * 현재 시스템 자원 강제 기록
   */
  recordCurrent: async (serverId: string, serverEqpmnId: string) => {
    const response = await client.post(`/admin/system/monitoring/logs/record?serverId=${serverId}&serverEqpmnId=${serverEqpmnId}`);
    return response.data;
  }
};
