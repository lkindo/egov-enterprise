package nuri.foundation.domain.user.entity;
 
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
 
@DisplayName("User (사용자 엔티티) 테스트")
class UserTest {
 
    @Test
    @DisplayName("사용자 엔티티 빌더 확인")
    void testBuilder() {
        User user = User.builder()
                .userId("user01")
                .userNm("홍길동")
                .pswd("pwd123")
                .esntlId("ESNTL_01")
                .build();
 
        assertEquals("user01", user.getUserId());
        assertEquals("홍길동", user.getUserNm());
    }
}