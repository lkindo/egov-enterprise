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
        password: '1'
    }
};
