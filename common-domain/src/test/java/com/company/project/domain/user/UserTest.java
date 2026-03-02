package com.company.project.domain.user;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * User 엔티티 도메인 로직 테스트
 */
class UserTest {

    @Test
    @DisplayName("Builder로 User 생성 - 기본 필드 확인")
    void createUser_withBuilder() {
        // When
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("홍길동")
                .password("hashedPassword")
                .emailAdres("test@example.com")
                .sbscrbDe(LocalDateTime.now())
                .build();

        // Then
        assertThat(user.getUserId()).isEqualTo("testUser");
        assertThat(user.getEsntlId()).isEqualTo("USR00001");
        assertThat(user.getUserNm()).isEqualTo("홍길동");
        assertThat(user.getPassword()).isEqualTo("hashedPassword");
        assertThat(user.getEmailAdres()).isEqualTo("test@example.com");
        assertThat(user.getRole()).isEqualTo(Role.USER); // Default role
        assertThat(user.getSbscrbDe()).isNotNull(); // Auto-set in constructor
    }

    @Test
    @DisplayName("Builder로 ADMIN 권한 설정 확인")
    void createUser_withAdminRole() {
        // When
        User user = User.builder()
                .userId("adminUser")
                .esntlId("ADM00001")
                .userNm("관리자")
                .password("adminPass")
                .role(Role.ADMIN)
                .build();

        // Then
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("update 메서드로 회원 정보 수정 확인")
    void updateUser() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("이전이름")
                .password("password")
                .emailAdres("old@example.com")
                .role(Role.USER)
                .build();

        // When
        user.update(
                "수정된이름", // userNm
                null, // passwordHint
                null, // passwordCnsr
                null, // emplNo
                null, // ihidnum
                null, // sexdstnCode
                null, // brth
                null, // areaNo
                null, // homemiddleTelno
                null, // homeendTelno
                null, // fxnum
                null, // homeadres
                null, // detailAdres
                null, // zip
                null, // offmTelno
                "010-1234-5678", // moblphonNo
                "new@example.com", // emailAdres
                null, // ofcpsNm
                null, // groupId
                null, // orgnztId
                null, // insttCode
                Role.ADMIN, // role
                null // subDn
        );

        // Then
        assertThat(user.getUserNm()).isEqualTo("수정된이름");
        assertThat(user.getMoblphonNo()).isEqualTo("010-1234-5678");
        assertThat(user.getEmailAdres()).isEqualTo("new@example.com");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("updatePassword로 비밀번호 변경 확인")
    void updatePassword() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("사용자")
                .password("oldPassword")
                .build();

        // When
        user.updatePassword("newSecurePassword");

        // Then
        assertThat(user.getPassword()).isEqualTo("newSecurePassword");
    }

    @Test
    @DisplayName("모든 필드 설정을 통한 User 생성")
    void createUser_withAllFields() {
        // When
        User user = User.builder()
                .userId("fullUser")
                .esntlId("USR00002")
                .userNm("전체필드사용자")
                .password("password")
                .passwordHint("hint")
                .passwordCnsr("answer")
                .emplNo("EMP001")
                .ihidnum("*******")
                .sexdstnCode("M")
                .brth("19900101")
                .areaNo("02")
                .homemiddleTelno("1234")
                .homeendTelno("5678")
                .fxnum("02-1234-5678")
                .homeadres("서울시 중구 세종대로")
                .detailAdres("123번지 456호")
                .zip("12345")
                .offmTelno("02-9876-5432")
                .moblphonNo("010-1111-2222")
                .emailAdres("full@example.com")
                .ofcpsNm("연구원")
                .groupId("GRP001")
                .orgnztId("ORG001")
                .insttCode("INST001")
                .role(Role.USER)
                .subDn("CN=user")
                .build();

        // Then
        assertThat(user.getUserId()).isEqualTo("fullUser");
        assertThat(user.getPasswordHint()).isEqualTo("hint");
        assertThat(user.getEmplNo()).isEqualTo("EMP001");
        assertThat(user.getSexdstnCode()).isEqualTo("M");
        assertThat(user.getOfcpsNm()).isEqualTo("연구원");
        assertThat(user.getSubDn()).isEqualTo("CN=user");
    }

    @Test
    @DisplayName("unlock 메서드로 잠금 상태 및 횟수 초기화 확인")
    void unlock() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("사용자")
                .password("password")
                .lockAt("Y")
                .lockCount(5)
                .lockLastDate(LocalDateTime.now())
                .build();

        // When
        user.unlock();

        // Then
        assertThat(user.getLockAt()).isEqualTo("N");
        assertThat(user.getLockCount()).isEqualTo(0);
        assertThat(user.getLockLastDate()).isNull();
    }

    @Test
    @DisplayName("incrementLockCount 메서드로 잠금 횟수 증가 확인")
    void incrementLockCount() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("사용자")
                .password("password")
                .build();

        // When
        user.incrementLockCount();
        user.incrementLockCount();

        // Then
        assertThat(user.getLockCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("setAuthorCode 메서드로 Role 설정 확인")
    void setAuthorCode() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("사용자")
                .password("password")
                .build();

        // When
        user.setAuthorCode("ADMIN");

        // Then
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);

        // When: Invalid code
        user.setAuthorCode("INVALID_ROLE");

        // Then: Defaults to USER
        assertThat(user.getRole()).isEqualTo(Role.USER);

        // When: null code
        user.setAuthorCode(null);
        assertThat(user.getRole()).isEqualTo(Role.USER); // No change
    }

    @Test
    @DisplayName("getAuthorCode 메서드로 Role 이름 반환 확인")
    void getAuthorCode() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("사용자")
                .password("password")
                .role(Role.ADMIN)
                .build();

        // Then
        assertThat(user.getAuthorCode()).isEqualTo("ADMIN");

        // When
        user.setRole(null);

        // Then
        assertThat(user.getAuthorCode()).isNull();
    }
}
