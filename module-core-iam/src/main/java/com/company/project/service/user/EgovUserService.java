package com.company.project.service.user;

import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

import java.util.List;

/**
 * 사용자 관리 서비스 인터페이스
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 정의
 */
public interface EgovUserService {

    /**
     * 사용자 목록 조회
     */
    List<UserDto> getUserList();

    /**
     * 사용자 목록 페이지 조회
     */
    Page<UserDto> getPagedUserList(@NonNull Pageable pageable);

    /**
     * 사용자 상세 조회
     */
    UserDto getUserById(@NonNull String userId);

    /**
     * 사용자 등록
     */
    String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
            String passwordHint, String passwordCnsr,
            com.company.project.domain.user.entity.Role role);

    /**
     * 사용자 회원가입
     */
    UserResponse signup(UserSignupRequest request);

    /**
     * 비밀번호 검증
     */
    boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword);

    /**
     * 사용자 정보 수정
     */
    void updateUser(@NonNull String userId, @NonNull UserDto userDto);

    /**
     * 사용자 삭제
     */
    void deleteUser(@NonNull String userId);
}
