package com.company.project.domain.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * User 도메인 엔티티 단위 테스트
 */
class UserTest {

    @Test
    @DisplayName("Builder로 User 생성 - 기본값 검증")
    void createUser_withBuilder() {
        // When
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("테스트 사용자")
                .password("hashedPassword")
                .emailAdres("test@example.com")
                .build();

        // Then
        assertThat(user.getUserId()).isEqualTo("testUser");
        assertThat(user.getEsntlId()).isEqualTo("USR00001");
        assertThat(user.getUserNm()).isEqualTo("테스트 사용자");
        assertThat(user.getPassword()).isEqualTo("hashedPassword");
        assertThat(user.getEmailAdres()).isEqualTo("test@example.com");
        assertThat(user.getRole()).isEqualTo(Role.USER); // Default role
        assertThat(user.getSbscrbDe()).isNotNull(); // Auto-set in constructor
    }

    @Test
    @DisplayName("Builder로 ADMIN Role 지정")
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
    @DisplayName("update 메서드로 사용자 정보 수정")
    void updateUser() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("원래 이름")
                .password("password")
                .emailAdres("old@example.com")
                .role(Role.USER)
                .build();

        // When
        user.update(
                "수정된 이름", // userNm
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
        assertThat(user.getUserNm()).isEqualTo("수정된 이름");
        assertThat(user.getMoblphonNo()).isEqualTo("010-1234-5678");
        assertThat(user.getEmailAdres()).isEqualTo("new@example.com");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("updatePassword로 비밀번호 변경")
    void updatePassword() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("테스트")
                .password("oldPassword")
                .build();

        // When
        user.updatePassword("newSecurePassword");

        // Then
        assertThat(user.getPassword()).isEqualTo("newSecurePassword");
    }

    @Test
    @DisplayName("모든 필드로 User 생성")
    void createUser_withAllFields() {
        // When
        User user = User.builder()
                .userId("fullUser")
                .esntlId("USR00002")
                .userNm("전체 필드 사용자")
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
                .homeadres("서울시 강남구")
                .detailAdres("123동 456호")
                .zip("12345")
                .offmTelno("02-9876-5432")
                .moblphonNo("010-1111-2222")
                .emailAdres("full@example.com")
                .ofcpsNm("과장")
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
        assertThat(user.getOfcpsNm()).isEqualTo("과장");
        assertThat(user.getSubDn()).isEqualTo("CN=user");
    }
}
