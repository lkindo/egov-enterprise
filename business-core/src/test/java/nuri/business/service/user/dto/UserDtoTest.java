package nuri.business.service.user.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.entity.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("UserDto 및 UserResponse 매핑 테스트")
class UserDtoTest {

    @Test
    @DisplayName("from - null check")
    void testFrom_NullCheck() {
        assertNull(UserDto.from(null));
        
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").build();
        user.changeRole(null);
        UserDto dto = UserDto.from(user);
        assertNotNull(dto);
        assertEquals("user1", dto.userId());
        assertNull(dto.role());
    }

    @Test
    @DisplayName("from - with role")
    void testFrom_WithRole() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").role(Role.ADMIN).build();
        UserDto dto = UserDto.from(user);
        assertEquals("ADMIN", dto.role());
    }

    @Test
    @DisplayName("from with authority - all null")
    void testFromWithAuthority_AllNull() {
        assertNull(UserDto.from(null, null));
    }

    @Test
    @DisplayName("from with authority - null authority, user with role")
    void testFromWithAuthority_NullAuthority() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").role(Role.ADMIN).build();
        UserDto dto = UserDto.from(user, null);
        assertNotNull(dto);
        assertEquals("ROLE_ADMIN", dto.role());
        assertEquals("USR", dto.userSe());
    }

    @Test
    @DisplayName("from with authority - null authority, user without role")
    void testFromWithAuthority_NullAuthority_NullRole() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").build();
        user.changeRole(null);
        UserDto dto = UserDto.from(user, null);
        assertNotNull(dto);
        assertEquals("ROLE_USER", dto.role());
        assertEquals("USR", dto.userSe());
    }

    @Test
    @DisplayName("from with authority - with authority")
    void testFromWithAuthority_WithAuthority() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").build();
        UserAuthority auth = UserAuthority.builder().scrtyDcsnTrgtId("esntl1").authrtId("ROLE_SYS").mbrTypeCd("USR").build();
        UserDto dto = UserDto.from(user, auth);
        assertNotNull(dto);
        assertEquals("ROLE_SYS", dto.role());
        assertEquals("USR", dto.userSe());
    }

    @Test
    @DisplayName("from with authority - null user, with authority")
    void testFromWithAuthority_NullUser_WithAuthority() {
        UserAuthority auth = UserAuthority.builder().scrtyDcsnTrgtId("esntl1").authrtId("ROLE_SYS").mbrTypeCd("USR").build();
        assertNull(UserDto.from(null, auth));
    }

    @Test
    @DisplayName("UserResponse from - basic mapping")
    void testUserResponseFrom() {
        assertNull(UserResponse.from(null));
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").build();
        UserResponse response = UserResponse.from(user);
        assertNotNull(response);
        assertEquals("user1", response.userId());
    }

    @Test
    @DisplayName("[보안] 비밀번호 계열 필드는 JSON 응답으로 직렬화되지 않는다 (WRITE_ONLY)")
    void testPasswordFields_NotSerializedInResponse() throws Exception {
        // from(user, authority) 가 pswd 해시를 DTO 객체에 채우더라도(현행 거동) 응답 JSON 에는 새어나가면 안 된다.
        UserDto dto = UserDto.builder()
                .userId("user1").userNm("홍길동").esntlId("esntl1")
                .pswd("$2a$10$SECRETHASHVALUE1234567890")
                .pswdHint("첫 반려동물 이름")
                .pswdCrans("바둑이")
                .build();

        String json = new ObjectMapper().writeValueAsString(dto);

        // 키 자체가 응답에 존재하지 않아야 한다
        assertFalse(json.contains("\"pswd\""), "응답 JSON 에 pswd 키가 노출됨: " + json);
        assertFalse(json.contains("\"pswdHint\""), "응답 JSON 에 pswdHint 키가 노출됨");
        assertFalse(json.contains("\"pswdCrans\""), "응답 JSON 에 pswdCrans 키가 노출됨");
        // 비밀번호 해시 값이 절대 실려나가지 않아야 한다
        assertFalse(json.contains("SECRETHASHVALUE"), "비밀번호 해시가 응답에 노출됨: " + json);
        // 정상 필드는 여전히 직렬화되어야 한다(회귀 방지)
        assertTrue(json.contains("\"userId\""), "일반 필드까지 누락되면 안 됨");
    }
}
