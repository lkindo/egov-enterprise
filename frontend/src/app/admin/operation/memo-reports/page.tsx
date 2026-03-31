import { Metadata } from 'next';
import MemoReportManagementClient from './MemoReportManagementClient';

export const metadata: Metadata = {
  title: 'ë©”ëª¨ë³´ê³  ê´€ë¦?| eGov Enterprise System',
  description: '?ê³ ë¸??”í„°?„ë¼?´ì¦ˆ ?µí•© ì»¤ë??ˆì??´ì…˜ ë°?ë¹„ì •??ë³´ê³  ê´€ë¦??¼í„°',
};

export default function MemoReportPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <MemoReportManagementClient />
    </div>
  );
}
