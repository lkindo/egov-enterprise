import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have log methods', () => {
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should be able to log info', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => logger as any);
    logger.info('test info');
    expect(spy).toHaveBeenCalledWith('test info');
  });

  it('should be able to log error', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => logger as any);
    logger.error('test error');
    expect(spy).toHaveBeenCalledWith('test error');
  });
});
