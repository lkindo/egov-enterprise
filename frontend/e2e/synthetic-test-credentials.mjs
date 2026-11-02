/**
 * E2E 테스트용 공통 계정 정보 설정
 * 모든 E2E 테스트 및 auth.setup.ts에서 이 파일을 참조합니다.
 */
export const TEST_CREDENTIALS = {
    admin: {
        id: 'webmaster',
        password: '1'
    },
    user: {
        id: 'TEST1',
        // 벤더 대표 묶음은 시드가 없어 실행기가 이 계정을 API 로 만든다. 비밀번호 정책을 거치므로 실행기가 값을 넘긴다.
        password: process.env.E2E_TEST_USER_PASSWORD || '1'
    }
};
