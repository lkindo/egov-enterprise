package com.company.project.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class UserEntityTest {

    @Test
    @DisplayName("사용자 정보 업데이트 테스트")
    void update_success() {
        // given
        User user = User.builder()
                .userId("testuser")
                .esntlId("USR_0001")
                .userNm("Original Name")
                .password("password")
                .role(Role.USER)
                .build();

        // when
        user.update("Updated Name", "Hint", "Answer", "123", "ihid", "M", "19900101",
                "02", "1234", "5678", "02-1234-5678", "Home Address", "Detail", "12345",
                "02-111-222", "010-1234-5678", "test@test.com", "Dev", "GROUP_01", "ORG_01", "INST_01", Role.ADMIN, "DN_VALUE");

        // then
        assertThat(user.getUserNm()).isEqualTo("Updated Name");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getEmailAdres()).isEqualTo("test@test.com");
    }

    @Test
    @DisplayName("비밀번호 업데이트 및 업데이트 시간 변경 테스트")
    void updatePassword_success() {
        // given
        User user = User.builder()
                .userId("testuser")
                .esntlId("USR_0001")
                .password("old_password")
                .build();

        // when
        user.updatePassword("new_password");

        // then
        assertThat(user.getPassword()).isEqualTo("new_password");
        assertThat(user.getPasswordUpdateDate()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    @Test
    @DisplayName("계정 잠금 해제 테스트")
    void unlock_success() {
        // given
        User user = User.builder()
                .userId("testuser")
                .lockAt("Y")
                .lockCount(5)
                .lockLastDate(LocalDateTime.now())
                .build();

        // when
        user.unlock();

        // then
        assertThat(user.getLockAt()).isEqualTo("N");
        assertThat(user.getLockCount()).isEqualTo(0);
        assertThat(user.getLockLastDate()).isNull();
    }

    @Test
    @DisplayName("잠금 횟수 증가 테스트")
    void incrementLockCount_success() {
        // given
        User user = User.builder()
                .userId("testuser")
                .lockCount(null)
                .build();

        // when
        user.incrementLockCount();
        user.incrementLockCount();

        // then
        assertThat(user.getLockCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("권한 코드 설정 테스트")
    void setAuthorCode_success() {
        // given
        User user = User.builder().userId("testuser").build();

        // when
        user.setAuthorCode("ROLE_ADMIN");

        // then
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getAuthorCode()).isEqualTo("ADMIN");
        
        // check fallback
        user.setAuthorCode("INVALID_ROLE");
        assertThat(user.getRole()).isEqualTo(Role.USER);
    }
}
