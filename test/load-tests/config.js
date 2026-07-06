/**
 * k6 테스트 설정
 * 
 * 환경 변수와 기본 설정을 관리합니다.
 */

/**
 * 환경별 설정
 */
export const Config = {
  // 기본 URL (환경 변수 BASE_URL 로 오버라이드 가능)
  BASE_URL: __ENV.BASE_URL || 'http://localhost:8080',

  // API 프리픽스
  API_PREFIX: '/api/v1',

  // 테스트 데이터 설정
  TEST_USERNAME: __ENV.TEST_USERNAME || 'admin',
  TEST_PASSWORD: __ENV.TEST_PASSWORD || 'admin123!',

  /**
   * 기본 헤더 생성
   * @param {string|null} token - JWT 토큰 (선택)
   * @returns {object} 헤더 객체
   */
  getDefaultHeaders(token = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'k6 Load Tester/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  /**
   * 인증이 필요한 헤더 생성
   * @param {string} token - JWT 토큰
   * @returns {object} 헤더 객체
   */
  getAuthHeaders(token) {
    return {
      ...this.getDefaultHeaders(),
      'Authorization': `Bearer ${token}`,
    };
  },
};

/**
 * 기본 k6 옵션
 */
export const defaultOptions = {
  // 요약 리포트 통계
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // HTTP 타임아웃
  httpTimeout: '30s',

  // 기본 임계값
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 요청이 500ms 이내
    http_req_failed: ['rate<0.01'],   // 1% 미만 실패
  },
};

/**
 * 환경 설정 로드
 * @returns {object} 환경 설정 객체
 */
export function loadEnvConfig() {
  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:8080',
    testUsername: __ENV.TEST_USERNAME || 'testuser',
    testPassword: __ENV.TEST_PASSWORD || 'testpass123!',
    isProduction: __ENV.ENVIRONMENT === 'production',
  };
}
