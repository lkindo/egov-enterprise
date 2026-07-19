import { redirect } from 'next/navigation';

/** 레거시 경로. 등록 화면의 정본은 /smart-toolkit/dept-job/create 다. (사유는 selectDeptJobList/page.tsx 주석 참조) */
export default function Page() {
    redirect('/smart-toolkit/dept-job/create');
}
