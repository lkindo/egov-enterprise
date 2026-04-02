package com.company.project.foundation.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("UserEntity 테스트")
class UserEntityTest {

    @Test
    @DisplayName("사용자 엔티티 빌더 확인")
    void testBuilder() {
        UserEntity user = UserEntity.builder()
                .emplyrId("user01")
                .userNm("홍길동")
                .password("pwd123")
                .build();

        assertEquals("user01", user.getEmplyrId());
        assertEquals("홍길동", user.getUserNm());
    }
}