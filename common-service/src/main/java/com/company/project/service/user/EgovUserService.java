package com.company.project.service.user;

import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;

import java.util.List;

/**
 * 사용자 관리 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovUserService {

    /**
     * 사용자 목록 조회
     */
    List<UserDto> getUserList();

    /**
     * 사용자 목록 페이징 조회
     */
    org.springframework.data.domain.Page<UserDto> getPagedUserList(org.springframework.data.domain.Pageable pageable);

    /**
     * 사용자 상세 조회
     */
    UserDto getUserById(String userId);

    /**
     * 사용자 등록
     */
    String registerUser(String userId, String password, String userNm,
            String passwordHint, String passwordCnsr,
            com.company.project.domain.user.Role role);

    /**
     * 사용자 회원가입
     */
    UserResponse signup(UserSignupRequest request);

    /**
     * 비밀번호 검증
     */
    boolean verifyPassword(String rawPassword, String encodedPassword);
}
