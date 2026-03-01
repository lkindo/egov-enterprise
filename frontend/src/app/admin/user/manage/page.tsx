import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { userAdminService } from '@/services/admin/user/UserAdminService';
import UserManageClient from './UserManageClient';
import { Loader2 } from 'lucide-react';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
    title: '사용자 계정 관리 | 전자정부 표준프레임워크',
    description: '시스템 사용자 계정을 관리하고 승인 처리합니다.',
};

export default async function UserManagePage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const pageIndex = Number(resolvedSearchParams.pageIndex) || 1;
    const searchCondition = (resolvedSearchParams.searchCondition as string) || '0';
    const searchKeyword = (resolvedSearchParams.searchKeyword as string) || '';
    const sbscrbSttus = (resolvedSearchParams.sbscrbSttus as string) || '';

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    let initialData: any = { resultList: [], paginationInfo: { totalRecordCount: 0 } };
    try {
        const rawData = await userAdminService.getUsers({
            pageIndex,
            searchCondition,
            searchKeyword,
            sbscrbSttus
        }, axiosConfig);

        // 직렬화 최적화: 필요한 필드만 추출하여 클라이언트로 전송
        initialData = {
            resultList: selectFieldsList(rawData.resultList, [
                'userId', 'userNm', 'email', 'userSttusCode', 'sbscrbDe'
            ] as any[]),
            paginationInfo: rawData.paginationInfo
        };
    } catch (error: any) {
        console.error('Server-side fetch users failed:', error);
        // 401 에러(인증 만료/없음) 발생 시 로그인 페이지로 리렉트
        if (error.response?.status === 401 || !accessToken) {
            redirect('/login?expired=true');
        }
    }

    return (
        <Suspense fallback={<UserManageLoading />}>
            <UserManageClient
                initialData={initialData}
                initialParams={{
                    pageIndex,
                    searchCondition,
                    searchKeyword,
                    sbscrbSttus
                }}
            />
        </Suspense>
    );
}

function UserManageLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="h-12 w-64 bg-slate-100 rounded-2xl" />
                <div className="h-12 w-48 bg-slate-100 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-[2.5rem]" />)}
            </div>
            <div className="h-24 w-full bg-slate-50 rounded-[2.5rem]" />
            <div className="h-[500px] w-full bg-slate-50 rounded-[3rem]" />
        </div>
    );
}
