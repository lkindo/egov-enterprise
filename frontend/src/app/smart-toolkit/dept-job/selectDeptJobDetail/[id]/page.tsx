import { notFound, redirect } from 'next/navigation';

/**
 * 레거시 경로. 이름은 '상세'였지만 실제 내용은 등록 폼 복제본이었다(원본 파일 주석이 자인).
 * 진짜 상세·수정 화면인 /smart-toolkit/dept-job/[id] 로 보낸다.
 *
 * [2026-11-08] 경로의 id 를 그대로 실어 보내지 않는다 — 업무 번호는 양의 정수이므로 그 형식만 정규화해 보내고,
 * 아니면 없는 화면이다(IA §9.1.4: 해석→검증→다시 만들기). 숫자만 남으므로 따로 인코딩할 문자가 없다.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const deptTaskSn = Number((await params).id);
    if (!Number.isSafeInteger(deptTaskSn) || deptTaskSn <= 0) notFound();
    const id = String(deptTaskSn);
    redirect(`/smart-toolkit/dept-job/${id}`);
}
