import { DeptJobListSection } from '@/components/business/deptJob/DeptJobListSection';
import { connection } from 'next/server';

export default async function DeptJobPage() {
 await connection();
 return <DeptJobListSection />;
}
