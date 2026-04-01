import { Metadata } from 'next';
import RoughMapManagementClient from './RoughMapManagementClient';

export const metadata: Metadata = {
  title: '?½ë„ ê´€ë¦?| eGov Enterprise System',
  description: '?ê³ ë¸??”í„°?„ë¼?´ì¦ˆ ê³µê°„ ?¸í…”ë¦¬ì „??ë°??½ë„ ê´€ë¦??¼í„°',
};

export default function RoughMapPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <RoughMapManagementClient />
    </div>
  );
}
