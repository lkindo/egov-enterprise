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
    const url = `${Config.BASE_URL}${Config.API_PREFIX}/login`;
    
    const payload = {
      username: username,
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
      'login response has token': (r) => JSON.parse(r.body).token !== undefined,
    });

    if (!loginSuccess) {
      console.error('Login failed:', response.body);
      throw new Error('Authentication failed');
    }

    const responseBody = JSON.parse(response.body);
    this.token = responseBody.token;
    
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
