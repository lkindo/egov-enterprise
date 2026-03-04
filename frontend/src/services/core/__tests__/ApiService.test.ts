import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { ApiService } from '../ApiService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  }
}));

class TestService extends ApiService {
  constructor() {
    super('/test');
  }
}

describe('ApiService', () => {
  let service: TestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestService();
  });

  it('get should prepend baseURL correctly', async () => {
    await service.get('/list', { params: { id: 1 } });
    expect(client.get).toHaveBeenCalledWith('/test/list', { params: { id: 1 } });
  });

  it('post should work with data', async () => {
    const data = { name: 'item' };
    await service.post('/create', data);
    expect(client.post).toHaveBeenCalledWith('/test/create', data, undefined);
  });

  it('delete should work with correct path', async () => {
    await service.delete('/1');
    expect(client.delete).toHaveBeenCalledWith('/test/1', undefined);
  });
});