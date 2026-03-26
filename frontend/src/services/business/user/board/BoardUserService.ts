import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { BoardPost } from '@/types/business/board';

class BoardUserService extends UserService {
 constructor() {
 super('/boards');
 }

 async getPosts(bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }): Promise<PageResponse<BoardPost>> {
 return this.get<PageResponse<BoardPost>>(`/${bbsId}`, { params });
 }

 async getPost(bbsId: string, nttId: number): Promise<BoardPost> {
 return this.get<BoardPost>(`/${bbsId}/posts/${nttId}`);
 }

 async createPost(data: Partial<BoardPost>): Promise<BoardPost> {
 return this.post<BoardPost>('/posts', data);
 }

 async deletePost(bbsId: string, nttId: number): Promise<void> {
 return this.delete<void>(`/${bbsId}/posts/${nttId}`);
 }
}

export const boardUserService = new BoardUserService();
