package com.company.project.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class UserEntityTest {

    private User.UserBuilder<?, ?> createBaseUser() {
        return User.builder()
                .userId("testuser")
                .esntlId("USR_0001")
                .userNm("Original Name")
                .password("password");
    }

    @Test
    @DisplayName("사용자 정보 업데이트 테스트")
    void update_success() {
        // given
        User user = createBaseUser()
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
        User user = createBaseUser()
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
        User user = createBaseUser()
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
        User user = createBaseUser()
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
        User user = createBaseUser().build();

        // when
        user.setAuthorCode("ROLE_ADMIN");

        // then
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getAuthorCode()).isEqualTo("ADMIN");
        
        // check fallback
        user.setAuthorCode("INVALID_ROLE");
        assertThat(user.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("일반 사용자 정보 업데이트 테스트")
    void generalUser_update_success() {
        // given
        GeneralUser user = GeneralUser.builder()
                .esntlId("USR_0002")
                .mberId("general01")
                .mberNm("General User")
                .password("pass") // Fixed: Add password if @NonNull
                .build();

        // when
        user.update("Updated General", "Hint", "Answer", "ihid", "F", "123456", "Address", "02",
                "ST", "Detail", "5678", "010-1234-5678", "GROUP_02", "FX-123", "gen@test.com", "1234");

        // then
        assertThat(user.getMberNm()).isEqualTo("Updated General");
        assertThat(user.getMberEmailAdres()).isEqualTo("gen@test.com");
    }

    @Test
    @DisplayName("일반 사용자 비밀번호 업데이트 테스트")
    void generalUser_updatePassword_success() {
        // given
        GeneralUser user = GeneralUser.builder()
                .esntlId("USR_0002")
                .mberId("general01")
                .mberNm("Name")
                .password("old_pass")
                .build();

        // when
        user.updatePassword("new_pass");

        // then
        assertThat(user.getPassword()).isEqualTo("new_pass");
        assertThat(user.getChgPwdLastPnttm()).isNotNull();
    }

    @Test
    @DisplayName("기업 사용자 정보 업데이트 테스트")
    void enterpriseUser_update_success() {
        // given
        EnterpriseUser user = EnterpriseUser.builder()
                .esntlId("USR_0003")
                .entrprsmberId("company01")
                .cmpnyNm("Old Company")
                .entrprsMberPassword("pass") // Fixed: Add password
                .build();

        // when
        user.update("new_company_id", "ENT01", "123-45-67890", "123456-7890123", "New Company",
                "Manager", "12345", "Addr", "02", "02-123-4567", "IND01", "Applicant", "ST",
                "Hint", "Answer", "GROUP_03", "Detail", "5678", "02", "mail@corp.com");

        // then
        assertThat(user.getCmpnyNm()).isEqualTo("New Company");
        assertThat(user.getApplcntEmailAdres()).isEqualTo("mail@corp.com");
    }

    @Test
    @DisplayName("기업 사용자 비밀번호 업데이트 테스트")
    void enterpriseUser_updatePassword_success() {
        // given
        EnterpriseUser user = EnterpriseUser.builder()
                .esntlId("USR_0003")
                .entrprsmberId("company01")
                .entrprsMberPassword("old_pass")
                .cmpnyNm("Company")
                .build();

        // when
        user.updatePassword("new_corp_pass");

        // then
        assertThat(user.getEntrprsMberPassword()).isEqualTo("new_corp_pass");
        assertThat(user.getChgPwdLastPnttm()).isNotNull();
    }

    @Test
    @DisplayName("기업 사용자 잠금 해제 테스트")
    void enterpriseUser_unlock_success() {
        // given
        EnterpriseUser user = EnterpriseUser.builder()
                .esntlId("USR_0003")
                .entrprsmberId("company01")
                .entrprsMberPassword("pass")
                .cmpnyNm("Company")
                .lockAt("Y")
                .build();

        // when
        user.unlock();

        // then
        assertThat(user.getLockAt()).isNull();
    }
}
