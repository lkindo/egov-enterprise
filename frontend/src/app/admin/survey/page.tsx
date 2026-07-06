import React from 'react';
import SurveyHubClient from './SurveyHubClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설문 거버넌스 허브 | eGov Enterprise',
  description: '전사적 설문 조사 관리 및 데이터 분석 인텔리전스',
};

export default function SurveyManagementHubPage() {
  return (
    <div className="space-y-6">
      <SurveyHubClient />
    </div>
  );
}
