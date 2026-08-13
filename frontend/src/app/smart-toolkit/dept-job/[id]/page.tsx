import DeptJobDetailClient from './DeptJobDetailClient';

/**
 * 종전에는 `<DeptJobDetailClient />` 로 **params 를 넘기지 않았다**. 클라이언트도 받지 않았으므로
 * `[id]` 세그먼트는 라우팅에만 쓰이고 화면은 어떤 업무를 보는지 알 수 없는 상태였다.
 * Next 16 에서 params 는 Promise 이므로 await 해서 전달한다.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DeptJobDetailClient deptTaskSn={Number(id)} />;
}
