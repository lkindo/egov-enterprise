import { Metadata } from 'next';
import EventManagementClient from './EventManagementClient';

export const metadata: Metadata = {
  title: '?‰ì‚¬ ?•ë³´ ê´€ë¦?| eGov Enterprise System',
  description: '?ê³ ë¸??”í„°?„ë¼?´ì¦ˆ ?µí•© ?‰ì‚¬ ë°??´ì˜ ê´€ë¦??¼í„°',
};

export default function EventManagementPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <EventManagementClient />
    </div>
  );
}
