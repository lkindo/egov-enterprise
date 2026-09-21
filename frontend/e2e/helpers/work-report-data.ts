import { expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const WORK_REPORT_API = '/api/v1/work-reports';
export type WorkReportRecord = { rptpSn: number; rptTtl?: string };

/** API 계약과 브라우저 여정이 같은 합성 보고서 준비·정리 규칙을 사용한다. */
export function workReportData(auth: Record<string, string>) {
    async function findByTag(request: APIRequestContext, tag: string): Promise<WorkReportRecord[]> {
        const response = await request.get(
            `${WORK_REPORT_API}?searchKeyword=${encodeURIComponent(tag)}&pageIndex=1&pageUnit=100`,
            { headers: auth },
        );
        expect(response.ok(), '업무 보고 목록 조회가 성공해야 한다').toBeTruthy();
        return ((await response.json()).data.list as WorkReportRecord[]) ?? [];
    }

    async function seedReports(request: APIRequestContext, tag: string, count: number) {
        for (let index = 1; index <= count; index++) {
            const sequence = String(index).padStart(2, '0');
            const response = await request.post(WORK_REPORT_API, {
                headers: auth,
                data: {
                    rptTtl: `${tag}_${sequence}`, rptCn: `회귀 방어용 보고 ${sequence}`,
                    rptYmd: '20260720', rptSeCd: '1',
                },
            });
            expect(response.ok(), `업무 보고 등록이 성공해야 한다 (#${sequence})`).toBeTruthy();
        }
    }

    async function purgeByTag(request: APIRequestContext, tag: string) {
        for (const report of await findByTag(request, tag)) {
            // 검색 자체의 회귀를 검사하므로 검색 결과만 믿고 다른 테스트의 행을 지우지 않는다.
            const suffix = report.rptTtl?.slice(tag.length);
            if (report.rptpSn && report.rptTtl?.startsWith(tag) && /^_\d{2}$/.test(suffix ?? '')) {
                await request.delete(`${WORK_REPORT_API}/${report.rptpSn}`, { headers: auth });
            }
        }
    }

    const tagFor = (label: string) => `E2E25_RPT${label}_${randomUUID()}`;
    return { findByTag, seedReports, purgeByTag, tagFor };
}
