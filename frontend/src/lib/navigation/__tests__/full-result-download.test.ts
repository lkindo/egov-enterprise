import { describe, expect, it } from 'vitest';
import { exportLoginLogsOperation } from '@/types/generated-operations';
import { buildGeneratedDownloadUrl } from '../full-result-download';

describe('navigateToDownload', () => {
  it('generated descriptor path와 검증된 query로만 URL을 만든다', () => {
    expect(buildGeneratedDownloadUrl(exportLoginLogsOperation)).toBe(
      '/api/v1/admin/system/logs/login/export.xlsx',
    );
    expect(buildGeneratedDownloadUrl(exportLoginLogsOperation, {
      searchKeyword: 'alice kim',
      searchKeywordFrom: '2026-08-01',
      searchKeywordTo: '2026-08-31',
    })).toBe(
      '/api/v1/admin/system/logs/login/export.xlsx'
      + '?searchKeyword=alice+kim&searchKeywordFrom=2026-08-01&searchKeywordTo=2026-08-31',
    );
  });

  it('binary GET이 아닌 generated operation은 fail-closed로 거부한다', () => {
    expect(() => buildGeneratedDownloadUrl({
      ...exportLoginLogsOperation,
      method: 'post',
    } as typeof exportLoginLogsOperation)).toThrow(/binary GET/);
  });
});
