import { z } from 'zod';
import { test as base, expect, Response } from '@playwright/test';

/**
 * API 응답에 대한 Zod 스키마 검증을 수행하는 도우미 함수
 */
export async function validateContract(response: Response, schema: z.ZodTypeAny) {
    const status = response.status();
    if (status >= 400) {
        console.warn(`[CONTRACT WARNING] API returned status ${status} for ${response.url()}`);
        return;
    }

    try {
        const body = await response.json();
        //ApiResponse 구조 대응 (success, data, message)
        const dataToValidate = body.data !== undefined ? body.data : body;
        
        const result = schema.safeParse(dataToValidate);
        if (!result.success) {
            console.error(`🚨 [CONTRACT VIOLATION] at ${response.url()}:`, result.error.format());
            throw new Error(`API Contract Violation: ${response.url()}`);
        }
        console.log(`✅ [CONTRACT VALIDATED] ${response.url()}`);
    } catch (e) {
        if (e instanceof Error && e.message.includes('API Contract Violation')) {
            throw e;
        }
        console.log(`[CONTRACT SKIP] Could not parse JSON for ${response.url()}`);
    }
}
