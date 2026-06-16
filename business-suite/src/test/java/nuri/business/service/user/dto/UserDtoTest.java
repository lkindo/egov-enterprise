package nuri.business.service.user.dto;

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
        
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").role(null).build();
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
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").pswd("1234").role(null).build();
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
}
