import { smsAdminService } from '@/services/foundation/operation/SmsAdminService';
import SmsHubClient from './SmsHubClient';



export default async function SmsListPage() {
  // Fetch initial data on server
  const initialData = await smsAdminService.getSmsList({ page: 1, size: 20 });

  return <SmsHubClient initialData={initialData} />;
}
