/**
 * k6 공통 유틸리티 함수
 * 
 * HTTP 클라이언트, 인증 토큰 관리, 헬퍼 함수를 제공합니다.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from './config.js';

/**
 * 인증 토큰 관리 클래스
 */
/**
 * 로그인 응답에서 액세스 토큰을 뽑는다.
 *
 * 응답은 ApiResponse 래퍼다: { success, status, code, message, data: { accessToken, role }, ... }
 * 본문이 비어 있거나(404·502) JSON 이 아니면 undefined 를 돌려준다 —
 * 여기서 예외를 던지면 "로그인 실패" 가 "스크립트 오류" 로 둔갑해 원인이 가려진다.
 */
function extractAccessToken(response) {
  if (!response || !response.body) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(response.body);
    return parsed && parsed.data ? parsed.data.accessToken : undefined;
  } catch (e) {
    return undefined;
  }
}

export class AuthTokenManager {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * 로그인하고 토큰을 획득합니다.
   * @param {string} username - 사용자명
   * @param {string} password - 비밀번호
   * @returns {string} JWT 토큰
   */
  login(username, password) {
    // [2026-08-09 계약 정정] 종전 세 곳이 실제 API 와 어긋나 있었다.
    //   ① 경로  — `/api/v1/login` 으로 POST 했으나 실제는 `/api/v1/auth/login` 이다.
    //             404 라 본문이 비어서, 아래 JSON.parse 가
    //             "SyntaxError: Unexpected end of JSON input" 으로 터졌다.
    //   ② 필드  — `username` 을 보냈으나 LoginRequest 의 필드는 `userId` 다(@NotBlank).
    //   ③ 응답  — `body.token` 을 읽었으나 실제는 ApiResponse 로 감싼
    //             `body.data.accessToken` 이다(refreshToken 은 @JsonIgnore 라 본문에 없다).
    //   셋 다 이 부하 테스트가 한 번도 완주한 적이 없어 드러나지 않았다.
    const url = `${Config.BASE_URL}${Config.API_PREFIX}/auth/login`;

    const payload = {
      userId: username,
      password: password,
    };

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const response = http.post(url, JSON.stringify(payload), params);

    const loginSuccess = check(response, {
      'login status is 200': (r) => r.status === 200,
      // 본문이 비어 있으면(404 등) JSON.parse 가 예외를 던져 원인이 가려진다 —
      //   상태코드부터 확인하고, 파싱은 방어적으로 한다.
      'login response has token': (r) => extractAccessToken(r) !== undefined,
    });

    if (!loginSuccess) {
      console.error('Login failed:', response.body);
      throw new Error('Authentication failed');
    }

    this.token = extractAccessToken(response);
    
    // 토큰 만료 시간 설정 (현재 시간 + 1 시간)
    this.tokenExpiry = Date.now() + (60 * 60 * 1000);

    console.log('Login successful, token obtained');
    return this.token;
  }

  /**
   * 현재 토큰을 반환합니다.
   * @returns {string|null} JWT 토큰
   */
  getToken() {
    if (!this.token) {
      throw new Error('No token available. Call login() first.');
    }
    
    // 토큰 만료 확인
    if (Date.now() > this.tokenExpiry) {
      console.warn('Token expired, please login again');
      this.token = null;
      return null;
    }
    
    return this.token;
  }

  /**
   * 인증 헤더를 생성합니다.
   * @returns {object} Authorization 헤더 객체
   */
  getAuthHeader() {
    const token = this.getToken();
    if (!token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * 토큰을 초기화합니다.
   */
  logout() {
    this.token = null;
    this.tokenExpiry = null;
  }
}

/**
 * HTTP 클라이언트 유틸리티
 */
export class HttpClient {
  /**
   * GET 요청을 보냅니다.
   * @param {string} url - 요청 URL
   * @param {object} headers - HTTP 헤더
   * @returns {Response} k6 response 객체
   */
  static get(url, headers = {}) {
    const defaultHeaders = Config.getDefaultHeaders();
    const mergedHeaders = { ...defaultHeaders, ...headers };
    
    return http.get(url, { headers: mergedHeaders });
  }

  /**
   * POST 요청을 보냅니다.
   * @param {string} url - 요청 URL
   * @param {object} data - 요청 바디 데이터
   * @param {object} headers - HTTP 헤더
   * @returns {Response} k6 response 객체
   */
  static post(url, data, headers = {}) {
    const defaultHeaders = Config.getDefaultHeaders();
    const mergedHeaders = { ...defaultHeaders, ...headers };
    
    return http.post(url, JSON.stringify(data), { headers: mergedHeaders });
  }

  /**
   * PUT 요청을 보냅니다.
   * @param {string} url - 요청 URL
   * @param {object} data - 요청 바디 데이터
   * @param {object} headers - HTTP 헤더
   * @returns {Response} k6 response 객체
   */
  static put(url, data, headers = {}) {
    const defaultHeaders = Config.getDefaultHeaders();
    const mergedHeaders = { ...defaultHeaders, ...headers };
    
    return http.put(url, JSON.stringify(data), { headers: mergedHeaders });
  }

  /**
   * DELETE 요청을 보냅니다.
   * @param {string} url - 요청 URL
   * @param {object} headers - HTTP 헤더
   * @returns {Response} k6 response 객체
   */
  static delete(url, headers = {}) {
    const defaultHeaders = Config.getDefaultHeaders();
    const mergedHeaders = { ...defaultHeaders, ...headers };
    
    return http.del(url, null, { headers: mergedHeaders });
  }
}

/**
 * API 응답 검증 헬퍼
 */
export function checkApiResponse(response, checks) {
  return check(response, checks);
}

/**
 * 일반 성공 응답 검증
 * @param {Response} response - k6 response 객체
 * @param {string} checkName - 검증 이름
 * @returns {boolean} 검증 결과
 */
export function checkSuccessResponse(response, checkName = 'success response') {
  return check(response, {
    [`${checkName} status is 200`]: (r) => r.status === 200,
    [`${checkName} response time < 500ms`]: (r) => r.timings.duration < 500,
    [`${checkName} has valid JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * 에러 응답 검증
 * @param {Response} response - k6 response 객체
 * @param {number} expectedStatus - 예상 상태 코드
 * @returns {boolean} 검증 결과
 */
export function checkErrorResponse(response, expectedStatus = 400) {
  return check(response, {
    [`error status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

/**
 * 랜덤 슬립 (지정된 범위 내에서 무작위 대기)
 * @param {number} min - 최소 대기 시간 (초)
 * @param {number} max - 최대 대기 시간 (초)
 */
export function randomSleep(min, max) {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  sleep(sleepTime);
}

/**
 * 랜덤 숫자 생성
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 랜덤 숫자
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * UUID 생성
 * @returns {string} UUID 문자열
 */
export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
