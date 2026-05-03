package nuri.foundation.service.user.mapper;

import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("UserMapper Tests")
public class UserMapperTest {

    private final UserMapper mapper = new UserMapperImpl();

    @Test
    @DisplayName("toDto - null check")
    public void testToDto_NullCheck() {
        assertNull(mapper.toDto(null));
        
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").role(null).build();
        UserDto dto = mapper.toDto(user);
        assertNotNull(dto);
        assertEquals("user1", dto.getUserId());
        assertNull(dto.getRole());
    }

    @Test
    @DisplayName("toDto - with role")
    public void testToDto_WithRole() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").role(Role.ADMIN).build();
        UserDto dto = mapper.toDto(user);
        assertEquals("ADMIN", dto.getRole());
    }

    @Test
    @DisplayName("toDtoWithAuthority - all null")
    public void testToDtoWithAuthority_AllNull() {
        assertNull(mapper.toDtoWithAuthority(null, null));
    }

    @Test
    @DisplayName("toDtoWithAuthority - null authority, user with role")
    public void testToDtoWithAuthority_NullAuthority() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").role(Role.ADMIN).build();
        UserDto dto = mapper.toDtoWithAuthority(user, null);
        assertNotNull(dto);
        assertEquals("ROLE_ADMIN", dto.getRole());
        assertEquals("USR", dto.getUserSe());
    }

    @Test
    @DisplayName("toDtoWithAuthority - null authority, user without role")
    public void testToDtoWithAuthority_NullAuthority_NullRole() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").role(null).build();
        UserDto dto = mapper.toDtoWithAuthority(user, null);
        assertNotNull(dto);
        assertEquals("ROLE_USER", dto.getRole());
        assertEquals("USR", dto.getUserSe());
    }

    @Test
    @DisplayName("toDtoWithAuthority - with authority")
    public void testToDtoWithAuthority_WithAuthority() {
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").build();
        UserAuthority auth = UserAuthority.builder().uniqId("esntl1").authorCode("ROLE_SYS").mberTyCode("USR").build();
        UserDto dto = mapper.toDtoWithAuthority(user, auth);
        assertNotNull(dto);
        assertEquals("ROLE_SYS", dto.getRole());
        assertEquals("USR", dto.getUserSe());
    }

    @Test
    @DisplayName("toDtoWithAuthority - null user, with authority")
    public void testToDtoWithAuthority_NullUser_WithAuthority() {
        UserAuthority auth = UserAuthority.builder().uniqId("esntl1").authorCode("ROLE_SYS").mberTyCode("USR").build();
        // UserDto has @NonNull on userId and userNm, so building it without user throws NPE
        assertThrows(NullPointerException.class, () -> mapper.toDtoWithAuthority(null, auth));
    }

    @Test
    @DisplayName("toResponse - basic mapping")
    public void testToResponse() {
        assertNull(mapper.toResponse(null));
        User user = User.builder().userId("user1").esntlId("esntl1").userNm("Hong").password("1234").build();
        UserResponse response = mapper.toResponse(user);
        assertNotNull(response);
        assertEquals("user1", response.getUserId());
    }
}
