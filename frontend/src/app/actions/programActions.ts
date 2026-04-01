'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { Program } from '@/types/foundation/program';

interface ActionResponse {
    success: boolean;
    message: string;
}

interface SaveProgramParams {
    mode: 'create' | 'edit';
    data: Program;
}

export async function saveProgramAction(prevState: unknown, { mode, data }: SaveProgramParams): Promise<ActionResponse> {
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '저장 중 오류 발생';
        console.error('Save Program Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deleteProgramAction(prevState: unknown, name: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await programAdminService.deleteProgram(name, axiosConfig);

        revalidatePath('/admin/system/programs');
        return { success: true, message: '프로그램이 삭제되었습니다.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '삭제 중 오류 발생';
        console.error('Delete Program Error:', error);
        return { success: false, message: errorMessage };
    }
}
