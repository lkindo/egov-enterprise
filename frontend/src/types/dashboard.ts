export interface DashboardTask {
  id: string | number;
  nttId?: string | number;
  title?: string;
  nttSj?: string;
  date: string;
  isNew: boolean;
  author?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  frstRegisterPnttmStr?: string;
}

export type DashboardNoti = DashboardTask;

export interface DashboardResponse {
 success: boolean;
 notiList: DashboardNoti[];
 taskList: DashboardTask[];
}
