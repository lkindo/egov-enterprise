export interface DashboardNoti {
    id: string;
    title: string;
    date: string;
    author: string;
}

export interface DashboardTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
}

export interface DashboardResponse {
    success: boolean;
    notiList: DashboardNoti[];
    taskList: DashboardTask[];
}