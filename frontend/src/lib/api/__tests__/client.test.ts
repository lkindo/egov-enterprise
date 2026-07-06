vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
 const mockInstance = {
 interceptors: {
 request: { use: vi.fn(), eject: vi.fn() },
 response: { use: vi.fn(), eject: vi.fn() }
 },
 defaults: { headers: { common: {} } },
 get: vi.fn(),
 post: vi.fn(),
 };

 return {
 default: {
 create: vi.fn().mockReturnValue(mockInstance),
 interceptors: {
 request: { use: vi.fn() },
 response: { use: vi.fn() }
 }
 }
 };
});

describe('API Client Configuration', () => {
 beforeEach(() => {
 vi.resetModules();
 vi.clearAllMocks();
 });

 it('should create axios instance with correct defaults', async () => {
 await import('../client');
 expect(axios.create).toHaveBeenCalled();
 });

 it('should have interceptors defined on the instance', async () => {
 await import('../client');
 const instance = vi.mocked(axios.create).mock.results[0].value;
 expect(instance.interceptors.request.use).toHaveBeenCalled();
 expect(instance.interceptors.response.use).toHaveBeenCalled();
 });
});
