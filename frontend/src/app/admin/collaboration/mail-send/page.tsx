import { Suspense } from 'react';
import MailSendHubClient from './MailSendHubClient';

export default function MailSendPage() {
  return (
    <Suspense fallback={null}>
      <MailSendHubClient />
    </Suspense>
  );
}
