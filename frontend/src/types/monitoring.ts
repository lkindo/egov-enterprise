export interface ServerResourceLog {
  logId: string;
  serverId: string;
  serverNm: string;
  cpuUseRt: number;
  memoryUseRt: number;
  svcSttus: string;
  logDt: string;
}

export interface DbMonitoringLog {
  logId: string;
  dataSvcNm: string;
  dbNm: string;
  dbSttusCode: string;
  logDt: string;
}

export interface ProcessMonitoring {
  processNm: string;
  processSttus: 'RUNNING' | 'STOPPED';
  lastCheckDt: string;
}

export interface MonitoringSummary {
  serverStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
  cpuAvg: number;
  memAvg: number;
  activeProcesses: number;
  stoppedProcesses: number;
  dbStatus: 'CONNECTED' | 'DISCONNECTED';
}