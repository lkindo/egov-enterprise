export interface DashboardTask {
  id: string | number;
  bbsId?: string;
  pstSn?: number;
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


