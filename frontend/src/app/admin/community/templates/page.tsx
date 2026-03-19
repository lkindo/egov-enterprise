import { templateAdminService } from '@/services/admin/system/TemplateAdminService';
import { cookies } from 'next/headers';
import TemplateAdminClient from './TemplateAdminClient';

export const metadata = {
 title: '템플릿 관리 | 시스템관리',
};

export default async function TemplateAdminPage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 const initialTemplates = await templateAdminService.getTemplateList(axiosConfig).catch(() => []);

 return (
 <TemplateAdminClient initialTemplates={initialTemplates} />
 );
}
