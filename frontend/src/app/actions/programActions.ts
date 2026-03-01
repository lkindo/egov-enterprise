'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { programAdminService } from '@/services/admin/system/ProgramAdminService';
import { Program } from '@/types/program';

export async function saveProgramAction(prevState: any, { mode, data }: { mode: 'create' | 'edit', data: Program }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await programAdminService.createProgram(data, axiosConfig);
    } else {
      await programAdminService.updateProgram(data.progrmFileNm, data, axiosConfig);
    }

    revalidatePath('/admin/system/programs');
    return { success: true, message: `프로그램이 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error: any) {
    console.error('Save Program Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteProgramAction(prevState: any, name: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await programAdminService.deleteProgram(name, axiosConfig);

    revalidatePath('/admin/system/programs');
    return { success: true, message: '프로그램이 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Program Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
