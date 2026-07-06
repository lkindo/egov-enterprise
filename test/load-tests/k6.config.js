/**
 * k6 공통 설정 파일
 * 
 * usage:
 *   k6 run --config k6.config.js script.js
 */

export const options = {
  // 공통 설정
  userAgent: 'k6 Load Tester/1.0',
  
  // HTTP 기본 설정
  http: {
    // 기본 타임아웃 (ms)
    timeout: '30s',
    
    // TLS 설정
    tlsAuth: null,
  },
  
  // 성능 임계값 (thresholds)
  thresholds: {
    // HTTP 요청 응답 시간 (p95 기준)
    http_req_duration: ['p(95)<500'], // 95% 요청이 500ms 이내
    
    // HTTP 요청 실패율
    http_req_failed: ['rate<0.01'], // 1% 미만 실패
    
    // 전체 테스트 소요 시간
    test_duration: ['duration<300s'], // 5 분 이내 완료
  },
  
  // 기본 시나리오 (오버라이드 가능)
  scenarios: {
    default: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      gracefulStop: '5s',
    },
  },
  
  // 요약 리포트 설정
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

/**
 * 환경별 기본 URL
 */
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const API_PREFIX = '/api/v1';

/**
 * 공통 헤더
 */
export function getDefaultHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}
