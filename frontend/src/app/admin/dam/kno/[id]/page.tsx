import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { KnoManagementVO } from '@/types/dam';
import { KnoDetailClient } from './KnoDetailClient';
import { cookies } from 'next/headers';
import damService from '@/services/dam/damService';

export default async function KnoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    let kno: KnoManagementVO | null = null;
    try {
        kno = await damService.getKnoDetail(id, axiosConfig);
    } catch (error) {
        console.error('Server-side fetch kno detail failed:', error);
    }

    if (!kno) {
        return (
            <div className="p-20 text-center space-y-6">
                <div className="p-10 bg-rose-50 rounded-full w-fit mx-auto">
                    <Trash2 className="w-16 h-16 text-rose-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Insight Hidden or Deleted</h3>
                <p className="text-slate-500 font-medium">The article you are looking for might have been removed or shifted.</p>
                <Button asChild variant="outline" className="rounded-xl border-2 font-bold px-10">
                    <Link href="/admin/dam/kno">Return to Knowledge Base</Link>
                </Button>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
                <div className="h-20 w-full bg-slate-50 rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[600px] bg-slate-50 rounded-[2.5rem]" />
                    <div className="h-96 bg-slate-50 rounded-[2rem]" />
                </div>
            </div>
        }>
            <KnoDetailClient kno={kno} id={id} />
        </Suspense>
    );
}
