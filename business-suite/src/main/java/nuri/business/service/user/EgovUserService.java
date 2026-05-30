package nuri.business.service.user;

import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.domain.user.entity.Role;
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
    Page<UserDto> getPagedUserList(String searchKeyword, @NonNull Pageable pageable);

    /**
     * 사용자 목록 페이지 조회 (검색어 없음)
     */
    default Page<UserDto> getUserPage(@NonNull Pageable pageable) {
        return getPagedUserList(null, pageable);
    }

    /**
     * 사용자 목록 페이지 조회 (기본 페이징 적용)
     */
    default Page<UserDto> searchUserPage(String searchKeyword) {
        return getPagedUserList(searchKeyword, org.springframework.data.domain.PageRequest.of(0, 10));
    }

    /**
     * 사용자 상세 조회
     */
    UserDto getUserById(@NonNull String userId);

    /**
     * 아이디 중복 여부 확인
     */
    boolean checkIdDplct(@NonNull String userId);

    /**
     * 사용자 등록
     */
    String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
            String passwordHint, String passwordCnsr,
            String roleName);


    /**
     * 사용자 회원가입
     */
    UserResponse signup(UserSignupRequest request);

    /**
     * 비밀번호 검증
     */
    boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword);

    /**
     * 비밀번호 변경
     */
    void changePassword(@NonNull String userId, @NonNull String oldPassword, @NonNull String newPassword);

    /**
     * 사용자 정보 수정
     */
    void updateUser(@NonNull String userId, @NonNull UserDto userDto);

    /**
     * 사용자 삭제
     */
    void deleteUser(@NonNull String userId);

    /**
     * 여러 사용자 삭제
     */
    void deleteUserList(@NonNull List<String> userIds);

    /**
     * 여러 사용자의 상태를 한꺼번에 변경합니다.
     */
    void updateUsersStatus(@NonNull List<String> userIds, @NonNull String status);

    /**
     * 여러 사용자의 소속 부서를 한꺼번에 변경합니다.
     */
    void moveUsersToDept(@NonNull List<String> userIds, @NonNull String orgnztId);

    /**
     * 여러 사용자의 권한을 한꺼번에 변경합니다.
     */
    void updateUsersRole(@NonNull List<String> userIds, @NonNull Role role);

    /**
     * 관리자 권한으로 비밀번호를 변경합니다.
     */
    void updatePasswordByAdmin(@NonNull String userId, @NonNull String newPassword);
}
