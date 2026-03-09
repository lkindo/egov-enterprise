package com.company.project.api.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * UserController 인증 테스트 설정
 * Note: Security 관련 필터 등록 및 인증 절차 설정 테스트
 */
class UserControllerAuthTest {

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원가입 API 인증 설정 확인")
    void signup_test() {
        // Note: Security 설정 비활성화 상태에서의 동작 확인
    }
}
