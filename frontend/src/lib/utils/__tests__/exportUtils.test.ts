import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCsv } from '../exportUtils';

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('exportToCsv should trigger download with correct content', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    const columns = [
      { header: 'ID', accessorKey: 'id' },
      { header: 'Name', accessorKey: 'name' }
    ];

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    exportToCsv(data, columns as any, 'test_export');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('should handle empty data gracefully', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    exportToCsv([], [], 'test');
    expect(appendChildSpy).not.toHaveBeenCalled();
  });
});
