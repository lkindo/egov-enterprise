package com.company.project.foundation.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User ?”í‹°???ŒìŠ¤??)
class UserEntityTest {

    @Test
    @DisplayName("?¬ìš©??? ê¸ˆ ?Ÿìˆ˜ ì¦ê? ë°?ì´ˆê¸°???ŒìŠ¤??)
    void lockCountTest() {
        User user = User.builder().userId("user01").userNm("?ê¸¸??).esntlId("E1").password("pwd").build();
        
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
    @DisplayName("ê¶Œí•œ ì½”ë“œ ?¤ì • ?ŒìŠ¤??)
    void setAuthorCodeTest() {
        User user = User.builder().userId("user01").userNm("?ê¸¸??).esntlId("E1").password("pwd").build();
        
        user.setAuthorCode("ROLE_ADMIN");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        assertThat(user.getAuthorCode()).isEqualTo("ADMIN");
        
        user.setAuthorCode("USER");
        assertThat(user.getRole()).isEqualTo(Role.USER);
        
        user.setAuthorCode("INVALID");
        assertThat(user.getRole()).isEqualTo(Role.USER); // Default to USER
    }

    @Test
    @DisplayName("ë¹„ë?ë²ˆí˜¸ ?…ë°?´íŠ¸ ?ŒìŠ¤??)
    void updatePasswordTest() {
        User user = User.builder().userId("user01").userNm("?ê¸¸??).esntlId("E1").password("old").build();
        LocalDateTime before = LocalDateTime.now();
        
        user.updatePassword("newPassword");
        
        assertThat(user.getPassword()).isEqualTo("newPassword");
        assertThat(user.getPasswordUpdateDate()).isAfterOrEqualTo(before);
    }

    @Test
    @DisplayName("?¬ìš©???•ë³´ ?…ë°?´íŠ¸ ?ŒìŠ¤??)
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
