package nuri.foundation.security.jwt;
 
import nuri.foundation.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;
 
import java.util.Collections;
 
import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
 
@DisplayName("JwtTokenProvider 테스트")
class JwtTokenProviderTest {
 
    private JwtTokenProvider jwtTokenProvider;
    private final String secretKey = "testSecretKeytestSecretKeytestSecretKeytestSecretKey";
    
    @Mock
    private UserDetailsService userDetailsService;
 
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKey);
        // Invoke @PostConstruct init method
        ReflectionTestUtils.invokeMethod(jwtTokenProvider, "init");
        ReflectionTestUtils.setField(jwtTokenProvider, "userDetailsService", userDetailsService);
    }
 
    @Test
    @DisplayName("액세스 토큰 생성 및 검증 성공")
    void createToken_and_validate_success() {
        // Given
        User user = User.builder()
                .userId("testuser")
                .userNm("테스트")
                .esntlId("ESNTL_01")
                .pswd("password")
                .build();
        
        // When
        String token = jwtTokenProvider.createAccessToken(user.getUserId(), "ROLE_USER");
        
        // Then
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }
 
    @Test
    @DisplayName("토큰에서 인증 정보 조회 성공")
    void getAuthentication_success() {
        // Given
        String token = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getAuthorities()).thenReturn(Collections.emptyList());
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        
        // When
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        
        // Then
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(userDetails);
    }
 
    @Test
    @DisplayName("잘못된 토큰 검증 실패")
    void validateToken_fail() {
        // Given
        String invalidToken = "invalidToken";
        
        // When & Then
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }
}