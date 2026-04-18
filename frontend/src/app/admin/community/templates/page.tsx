import React, { Suspense } from 'react';
import { templateAdminService } from '@/services/foundation/system/TemplateAdminService';
import { cookies } from 'next/headers';
import TemplateAdminClient from './TemplateAdminClient';

export const metadata = {
  title: '템플릿 관리 | 시스템 관리',
};

export default async function TemplateAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate data promise without awaiting
  const templatesPromise = templateAdminService.getTemplateList(axiosConfig).catch(() => []);

  return (
    <Suspense fallback={<div className="p-24 text-center">Loading Blueprint Library...</div>}>
      <TemplateAdminClient templatesPromise={templatesPromise} />
    </Suspense>
  );
}
