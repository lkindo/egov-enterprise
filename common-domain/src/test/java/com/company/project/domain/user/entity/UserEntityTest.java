package com.company.project.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class UserEntityTest {

    @Test
    @DisplayName("User 엔티티 수동 생성 및 필드 접근 테스트")
    void userBasicTest() {
        User user = User.builder()
                .userId("testadmin")
                .esntlId("USR_0001")
                .userNm("AdminName")
                .password("testpass")
                .build();

        ReflectionTestUtils.setField(user, "userId", "testadmin");
        ReflectionTestUtils.setField(user, "userNm", "AdminName");

        assertThat(user.getUserId()).isEqualTo("testadmin");
        assertThat(user.getUserNm()).isEqualTo("AdminName");
    }
}
