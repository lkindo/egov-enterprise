import { UserService } from '@/services/core/ApiService';
import { BoardPost } from '@/types/board';

class BoardUserService extends UserService {
    constructor() {
        super('/boards');
    }

    async getPosts(bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }) {
        const response = await this.get<any>(`/${bbsId}`, { params });
        return response?.result || response;
    }

    async getPost(bbsId: string, nttId: number) {
        const response = await this.get<any>(`/${bbsId}/posts/${nttId}`);
        return response?.result || response;
    }

    async createPost(data: Partial<BoardPost>) {
        const response = await this.post<any>('/posts', data);
        return response?.result || response;
    }

    async deletePost(bbsId: string, nttId: number) {
        const response = await this.delete<any>(`/${bbsId}/posts/${nttId}`);
        return response?.result || response;
    }
}

export const boardUserService = new BoardUserService();
