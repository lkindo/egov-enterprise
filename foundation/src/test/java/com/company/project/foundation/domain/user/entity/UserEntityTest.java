package com.company.project.foundation.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User 엔티티 테스트")
class UserEntityTest {

    @Test
    @DisplayName("사용자 잠금 횟수 증가 및 초기화 테스트")
    void lockCountTest() {
        User user = User.builder().userId("user01").userNm("홍길동").esntlId("E1").password("pwd").build();
        
        assertThat(user.getLockCount()).isNull();
        
        user.incrementLockCount();
        assertThat(user.getLockCount()).isEqualTo(1);
        
        user.incrementLockCount();
        assertThat(user.getLockCount()).isEqualTo(2);
        
        user.unlock();
        assertThat(user.getLockAt()).isEqualTo("N");
        assertThat(user.getLockCount()).isEqualTo(0);
        assertThat(user.getLockLastDate()).isNull();
    }

    @Test
    @DisplayName("권한 코드 설정 테스트")
    void setAuthorCodeTest() {
        User user = User.builder().userId("user01").userNm("홍길동").esntlId("E1").password("pwd").build();
        
        user.setAuthorCode("ROLE_ADMIN");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getAuthorCode()).isEqualTo("ADMIN");
        
        user.setAuthorCode("USER");
        assertThat(user.getRole()).isEqualTo(Role.USER);
        
        user.setAuthorCode("INVALID");
        assertThat(user.getRole()).isEqualTo(Role.USER); // Default to USER
    }

    @Test
    @DisplayName("비밀번호 업데이트 테스트")
    void updatePasswordTest() {
        User user = User.builder().userId("user01").userNm("홍길동").esntlId("E1").password("old").build();
        LocalDateTime before = LocalDateTime.now();
        
        user.updatePassword("newPassword");
        
        assertThat(user.getPassword()).isEqualTo("newPassword");
        assertThat(user.getPasswordUpdateDate()).isAfterOrEqualTo(before);
    }

    @Test
    @DisplayName("사용자 정보 업데이트 테스트")
    void updateInfoTest() {
        User user = User.builder().userId("user01").userNm("Old Name").esntlId("E1").password("pwd").build();
        
        user.update("New Name", "Hint", "Answer", "123", "ihid", "M", "19900101", 
                   "02", "123", "456", "02-123-456", "Address", "Detail", "12345", 
                   "02-999-999", "010-1234-5678", "test@test.com", "Dev", "G1", "O1", "INST1", Role.ADMIN, "DN");
        
        assertThat(user.getUserNm()).isEqualTo("New Name");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getEmailAdres()).isEqualTo("test@test.com");
    }
}
