'use client';

import React from 'react';
import SecurityHubClient from './SecurityHubClient';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SecurityAuthorityHubPage() {
 return (
 <div className="space-y-6">
 <SecurityHubClient />
 </div>
 );
}
