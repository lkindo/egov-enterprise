/**
 * 테스트 사용자 생성 스크립트
 *
 * k6 를 사용하여 테스트용 사용자를 생성합니다.
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_PREFIX = '/api/v1';

export default function () {
  const signupUrl = `${BASE_URL}${API_PREFIX}/users/signup`;
  const loginUrl = `${BASE_URL}${API_PREFIX}/login`;

  // 랜덤 사용자 ID 생성 (영문 소문자 + 숫자)
  const randomId = `testuser${Math.floor(Math.random() * 10000)}`;

  const signupPayload = {
    userId: randomId,
    password: 'testpass123!',
    userNm: `TestUser${randomId}`,
    role: 'USER',
    passwordHint: 'test hint',
    passwordCnsr: 'test reason',
  };

  console.log(`Creating user: ${randomId}`);

  // 회원가입
  const signupResponse = http.post(signupUrl, JSON.stringify(signupPayload), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  const signupSuccess = check(signupResponse, {
    'signup status is 200': (r) => r.status === 200,
  });

  if (!signupSuccess) {
    console.error(`Signup failed: ${signupResponse.status}`);
    console.error(`Body: ${signupResponse.body}`);
  }

  if (signupSuccess) {
    console.log(`User created successfully: ${randomId}`);

    // 로그인 테스트
    const loginPayload = {
      username: randomId,
      password: 'testpass123!',
    };

    const loginResponse = http.post(loginUrl, JSON.stringify(loginPayload), {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const loginSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login response has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (loginSuccess) {
      console.log(`Login successful for user: ${randomId}`);
      const token = JSON.parse(loginResponse.body).token;
      console.log(`Token: ${token.substring(0, 50)}...`);
    } else {
      console.error(`Login failed for user: ${randomId}`);
    }
  } else {
    console.error(`Failed to create user: ${randomId}, status: ${signupResponse.status}`);
  }
}
