import { redirect } from 'next/navigation';

/**
 * 레거시 경로. 이름은 '상세'였지만 실제 내용은 등록 폼 복제본이었다(원본 파일 주석이 자인).
 * 진짜 상세·수정 화면인 /smart-toolkit/dept-job/[id] 로 보낸다.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/smart-toolkit/dept-job/${id}`);
}
