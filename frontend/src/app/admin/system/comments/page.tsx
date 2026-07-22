import React from 'react';
import MonitoringHubClient from '@/app/admin/system/monitoring/MonitoringHubClient';

export const metadata = {
  title: '댓글 관리 | 시스템 관리',
  description: '게시물에 등록된 댓글을 조회하고 관리합니다.',
};

/*
 * 이 화면은 모니터링 허브의 COMMENTS 탭을 그대로 위임 렌더한다.
 * 따라서 P1(오류 표시·확인 모달·디바운스·aria-label 등) 대상 코드는 전부
 * `admin/system/monitoring/MonitoringHubClient.tsx`(타 소유 파일)에 있다.
 */
export default function AdminCommentPage() {
 return <MonitoringHubClient defaultTab="COMMENTS" />;
}
