package nuri.api.controller.foundation.auth;
 
import nuri.foundation.security.net.ClientIpResolver;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.user.UserService;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.user.dto.UserDto;
import nuri.business.domain.user.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Spy;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
 
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
 
@DisplayName("AuthApiController 테스트")
class AuthApiControllerTest {
 
    private MockMvc mockMvc;
 
    @Mock
    private AuthService authService;
    
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    
    @Mock
    private UserService userService;
 
    /**
     * [W1-07] 신뢰 경계 판정은 목킹하지 않고 <b>실제 구현</b>을 쓴다.
     * 목으로 바꾸면 "어떤 IP 를 클라이언트로 보는가" 라는 이 컨트롤러의 보안 계약이 테스트에서 사라진다.
     * MockMvc 의 기본 remoteAddr 은 127.0.0.1 이라 신뢰 대상이고, 따라서 XFF 가 읽힌다.
     */
    @Spy
    private ClientIpResolver clientIpResolver = new ClientIpResolver(
            "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16");

    @InjectMocks
    private AuthApiController authApiController;
 
    private final ObjectMapper objectMapper = new ObjectMapper();
 
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }
 
    @Test
    @DisplayName("로그인 성공")
    void testLoginSuccess() throws Exception {
        // Given
        LoginRequest request = LoginRequest.builder().userId("user01").password("password").build();
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .role("ROLE_USER")
                .build();
 
        when(authService.login(any(), anyString())).thenReturn(tokenResponse);
 
        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                // [Phase 3 계약] refreshToken 은 바디에 노출되지 않는다(@JsonIgnore, HttpOnly 쿠키로만 전달)
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }
 
    @Test
    @DisplayName("로그인 실패 - 잘못된 비밀번호")
    void testLoginFail() throws Exception {
        // Given
        LoginRequest request = LoginRequest.builder().userId("user01").password("wrong-password").build();
        when(authService.login(any(), anyString())).thenThrow(new RuntimeException("인증 실패"));
 
        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
 
    @Test
    @DisplayName("토큰 재발급")
    void testReissue() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("new-access")
                .refreshToken("new-refresh")
                .role("ROLE_USER")
                .build();
        when(authService.reissue(any())).thenReturn(tokenResponse);
 
        mockMvc.perform(post("/api/v1/auth/reissue")
                .cookie(new jakarta.servlet.http.Cookie("refreshToken", "old-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("new-access"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }
 
    @Test
    @DisplayName("로그아웃")
    void testLogout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Logged out successfully"));
    }
 
    @Test
    @DisplayName("내 정보 조회")
    void testMe() throws Exception {
        // Given
        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        when(userDetails.getUserId()).thenReturn("user01");
        
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
 
        UserDto userDto = UserDto.builder()
                .userId("user01")
                .userNm("Test User")
                .esntlId("ESNTL_000000000001")
                .role(Role.USER.name())
                .build();
        when(userService.getUserById("user01")).thenReturn(userDto);
 
        // When & Then
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("user01"))
                .andExpect(jsonPath("$.data.name").value("Test User"))
                .andExpect(jsonPath("$.data.esntlId").value("ESNTL_000000000001"))
                .andExpect(jsonPath("$.data.pswd").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist());
        
        SecurityContextHolder.clearContext();
    }
 
    @Test
    @DisplayName("내 정보 조회 - 인증 정보 없음")
    void testMeUnauthorized() throws Exception {
        SecurityContextHolder.clearContext();
 
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }
 
    @Test
    @DisplayName("내 정보 조회 - 익명 사용자")
    void testMeAnonymous() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "anonymousUser", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
        SecurityContextHolder.getContext().setAuthentication(auth);
 
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
        
        SecurityContextHolder.clearContext();
    }
 
    @Test
    @DisplayName("내 정보 조회 - UserDetails가 아닌 Principal")
    void testMeSimplePrincipal() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "user01", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
 
        UserDto userDto = UserDto.builder()
                .userId("user01")
                .userNm("Test User")
                .esntlId("ESNTL_000000000001")
                .role(Role.USER.name())
                .build();
        when(userService.getUserById("user01")).thenReturn(userDto);
 
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("user01"))
                .andExpect(jsonPath("$.data.esntlId").value("ESNTL_000000000001"));
        
        SecurityContextHolder.clearContext();
    }
 
    @Test
    @DisplayName("[W1-07] 신뢰 피어(127.0.0.1)의 X-Forwarded-For 는 채택한다")
    void testGetClientIp_XForwardedFor() throws Exception {
        LoginRequest request = LoginRequest.builder().userId("user01").password("password").build();
        when(authService.login(any(), eq("10.0.0.1"))).thenReturn(TokenResponse.builder().build());
 
        mockMvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", "10.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
 
    @Test
    @DisplayName("[W1-07] 비표준 프록시 헤더(Proxy-Client-IP)는 더 이상 읽지 않는다 — 표준 XFF 만 신뢰")
    void testGetClientIp_ProxyClientIp() throws Exception {
        LoginRequest request = LoginRequest.builder().userId("user01").password("password").build();
        when(authService.login(any(), eq("127.0.0.1"))).thenReturn(TokenResponse.builder().build());
 
        mockMvc.perform(post("/api/v1/auth/login")
                .header("Proxy-Client-IP", "10.0.0.2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
 
    @Test
    @DisplayName("[W1-07] 비표준 프록시 헤더(WL-Proxy-Client-IP)도 읽지 않는다")
    void testGetClientIp_WlProxyClientIp() throws Exception {
        LoginRequest request = LoginRequest.builder().userId("user01").password("password").build();
        when(authService.login(any(), eq("127.0.0.1"))).thenReturn(TokenResponse.builder().build());
 
        mockMvc.perform(post("/api/v1/auth/login")
                .header("WL-Proxy-Client-IP", "10.0.0.3")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("[W1-07] 헤더가 unknown 이면 위조 불가한 remoteAddr 로 폴백한다")
    void testGetClientIp_UnknownHeaders() throws Exception {
        LoginRequest request = LoginRequest.builder().userId("user01").password("password").build();
        when(authService.login(any(), anyString())).thenReturn(TokenResponse.builder().build());

        mockMvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", "unknown")
                .header("Proxy-Client-IP", "unknown")
                .header("WL-Proxy-Client-IP", "unknown")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("로그아웃 - 인증된 상태")
    void testLogoutAuthenticated() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "user01", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Logged out successfully"));

        SecurityContextHolder.clearContext();
    }
}
