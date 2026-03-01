import { UserService } from '@/services/core/ApiService';
import { BoardPost, BoardResponse } from '@/types/board';

class BoardUserService extends UserService {
    constructor() {
        super('/boards');
    }

    async getPosts(bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }) {
        return this.get<any>(`/${bbsId}`, { params });
    }

    async getPost(bbsId: string, nttId: number) {
        return this.get<any>(`/${bbsId}/posts/${nttId}`);
    }

    async createPost(data: Partial<BoardPost>) {
        return this.post<any>('/posts', data);
    }

    async deletePost(bbsId: string, nttId: number) {
        return this.delete<any>(`/${bbsId}/posts/${nttId}`);
    }
}

export const boardUserService = new BoardUserService();
