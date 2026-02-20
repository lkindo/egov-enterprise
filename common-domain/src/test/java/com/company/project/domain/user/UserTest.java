package com.company.project.domain.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * User ?袁⑥컭???酉?????μ맄 ???뮞??
 */
class UserTest {

    @Test
    @DisplayName("Builder嚥?User ??밴쉐 - 疫꿸퀡??첎?野꺜筌?)
    void createUser_withBuilder() {
        // When
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("???뮞???????)
                .password("hashedPassword")
                .emailAdres("test@example.com")
                .build();

        // Then
        assertThat(user.getUserId()).isEqualTo("testUser");
        assertThat(user.getEsntlId()).isEqualTo("USR00001");
        assertThat(user.getUserNm()).isEqualTo("???뮞???????);
        assertThat(user.getPassword()).isEqualTo("hashedPassword");
        assertThat(user.getEmailAdres()).isEqualTo("test@example.com");
        assertThat(user.getRole()).isEqualTo(Role.USER); // Default role
        assertThat(user.getSbscrbDe()).isNotNull(); // Auto-set in constructor
    }

    @Test
    @DisplayName("Builder嚥?ADMIN Role 筌왖??)
    void createUser_withAdminRole() {
        // When
        User user = User.builder()
                .userId("adminUser")
                .esntlId("ADM00001")
                .userNm("?온?귐딆쁽")
                .password("adminPass")
                .role(Role.ADMIN)
                .build();

        // Then
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("update 筌롫뗄苑??뺤쨮 ??????類ｋ궖 ??륁젟")
    void updateUser() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("?癒?삋 ??已?)
                .password("password")
                .emailAdres("old@example.com")
                .role(Role.USER)
                .build();

        // When
        user.update(
                "??륁젟????已?, // userNm
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
        assertThat(user.getUserNm()).isEqualTo("??륁젟????已?);
        assertThat(user.getMoblphonNo()).isEqualTo("010-1234-5678");
        assertThat(user.getEmailAdres()).isEqualTo("new@example.com");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("updatePassword嚥???쑬?甕곕뜇??癰궰野?)
    void updatePassword() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .esntlId("USR00001")
                .userNm("???뮞??)
                .password("oldPassword")
                .build();

        // When
        user.updatePassword("newSecurePassword");

        // Then
        assertThat(user.getPassword()).isEqualTo("newSecurePassword");
    }

    @Test
    @DisplayName("筌뤴뫀諭??袁⑤굡嚥?User ??밴쉐")
    void createUser_withAllFields() {
        // When
        User user = User.builder()
                .userId("fullUser")
                .esntlId("USR00002")
                .userNm("?袁⑷퍥 ?袁⑤굡 ?????)
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
                .homeadres("??뽰뒻??揶쏅베沅볠뤃?)
                .detailAdres("123??456??)
                .zip("12345")
                .offmTelno("02-9876-5432")
                .moblphonNo("010-1111-2222")
                .emailAdres("full@example.com")
                .ofcpsNm("?⑥눘??)
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
        assertThat(user.getOfcpsNm()).isEqualTo("?⑥눘??);
        assertThat(user.getSubDn()).isEqualTo("CN=user");
    }
}
