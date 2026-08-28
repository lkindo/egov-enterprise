import HpcmClient from './HpcmClient';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';

export default async function HpcmPage() {
    let list: Hpcm[] = [];
    let total: number | undefined;
    let totalPage: number | undefined;
    /*
      종전에는 catch { console.error } 로 실패를 삼켜, 화면이 '등록된 도움말 콘텐츠가 없습니다'
      라고 거짓말했다. 조회 실패와 데이터 없음은 사용자에게 전혀 다른 상황이다 —
      사유를 클라이언트로 내려 표 자체가 오류·재시도로 드러내게 한다.
    */
    let fetchError: string | null = null;

    try {
        const res = await hpcmAdminService.getHpcmList({ page: 0, size: 10, sort: 'hlpSn,DESC' });
        list = res.list || [];
        total = res.total;
        totalPage = res.totalPage;
    } catch (error) {
        fetchError = error instanceof Error && error.message
            ? error.message
            : '도움말 콘텐츠를 불러오지 못했습니다.';
    }

    return <HpcmClient initialData={{ list, total, totalPage }} fetchError={fetchError} />;
}
