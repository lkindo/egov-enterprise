package nuri.auth;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 계정 잠금이 <b>실제로 영속되는가</b>를 트랜잭션 경계를 통과시켜 검증한다.
 *
 * <p><b>[왜 이 테스트가 따로 필요한가]</b> 잠금 로직의 기존 검증은 전부 리포지터리를 목(mock)한
 * 단위 테스트({@code EgovAuthenticationProviderTest})였다. 목은 "엔티티의 필드가 바뀌었는가"만 볼 수 있고
 * <b>그 변경이 커밋되는가</b>는 원리적으로 볼 수 없다. 같은 이유로 {@code AuthenticationControllerIntegrationTest}
 * 도 이 결함을 놓친다 — 그 클래스는 {@code @Transactional} 이라 테스트 트랜잭션이 모든 것을 감싸고
 * 롤백해 버려, 프로덕션의 트랜잭션 경계가 재현되지 않는다.
 *
 * <p>그래서 이 클래스는 <b>의도적으로 {@code @Transactional} 을 붙이지 않는다.</b>
 * {@code AuthService.login} 이 자기 트랜잭션을 열고 닫는 실제 경계를 그대로 통과시켜야
 * "실패 카운터가 커밋되는가"를 판정할 수 있다.
 *
 * <p><b>[무엇을 고정하는가]</b> 로그인 실패 시 {@code EgovAuthenticationProvider} 는
 * {@code noRollbackFor = BadCredentialsException.class} 로 카운터를 지키려 한다. 그러나 전파가
 * REQUIRED 라 호출자 {@code AuthServiceImpl.login} 과 <b>물리 트랜잭션을 공유</b>하므로,
 * 호출자 쪽에 같은 예외가 롤백 대상으로 남아 있으면 예외가 바깥 인터셉터까지 올라가는 순간
 * <b>카운터와 잠금이 통째로 롤백된다</b>. 그러면 잠금은 영원히 발동하지 않고, 무차별 대입 방어가
 * 서류상으로만 존재하게 된다. 이 테스트는 그 무음 결함을 red 로 만든다.
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class)
@ActiveProfiles("test")
@DisplayName("계정 잠금 영속성 통합 테스트 (트랜잭션 경계)")
class LoginLockoutPersistenceIntegrationTest {

    private static final String USER_ID = "lockvictim";
    private static final String ESNTL_ID = "USR_LOCKTEST00001";
    private static final String RIGHT_PASSWORD = "Correct1!pass";
    private static final String CLIENT_IP = "127.0.0.1";

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** 임계값을 하드코딩하지 않는다 — 설정이 바뀌면 테스트도 함께 따라가야 계약이 유지된다. */
    @Value("${nuri.security.login.max-failures:5}")
    private int maxFailures;

    @BeforeEach
    void setUp() {
        // 이 클래스는 트랜잭션 롤백에 기대지 않으므로(그것이 요지다) 앞뒤로 직접 청소한다.
        removeVictim();
        userRepository.save(User.builder()
                .userId(USER_ID)
                .pswd(passwordEncoder.encode(RIGHT_PASSWORD))
                .userNm("Lock Victim")
                .esntlId(ESNTL_ID)
                .userSttsCd("A")
                .build());
    }

    @AfterEach
    void tearDown() {
        removeVictim();
    }

    private void removeVictim() {
        userRepository.findByUserId(USER_ID).ifPresent(userRepository::delete);
    }

    private void attemptLogin(String password) {
        authService.login(
                LoginRequest.builder().userId(USER_ID).password(password).build(),
                CLIENT_IP);
    }

    @Test
    @DisplayName("연속 실패가 임계에 도달하면 실패 카운터와 잠금 상태가 DB 에 남는다")
    void failureCounterAndLockAreCommitted() {
        for (int i = 0; i < maxFailures; i++) {
            final int attempt = i;
            assertThatThrownBy(() -> attemptLogin("wrong-password-" + attempt))
                    .isInstanceOf(AuthenticationException.class);
        }

        User reloaded = userRepository.findByUserId(USER_ID).orElseThrow();

        assertThat(reloaded.getLckCnt())
                .as("실패 카운터가 커밋되지 않았다 — 로그인 실패 트랜잭션이 롤백되고 있다")
                .isEqualTo(maxFailures);
        assertThat(reloaded.isLocked())
                .as("임계 도달에도 계정이 잠기지 않았다 — 무차별 대입 방어가 실제로는 작동하지 않는다")
                .isTrue();
    }

    @Test
    @DisplayName("잠긴 뒤에는 올바른 비밀번호로도 로그인되지 않는다")
    void correctPasswordIsRejectedAfterLock() {
        for (int i = 0; i < maxFailures; i++) {
            final int attempt = i;
            assertThatThrownBy(() -> attemptLogin("wrong-password-" + attempt))
                    .isInstanceOf(AuthenticationException.class);
        }

        assertThatThrownBy(() -> attemptLogin(RIGHT_PASSWORD))
                .as("잠금 상태에서 올바른 비밀번호가 통과했다 — 잠금이 발동하지 않았다는 뜻이다")
                .isInstanceOf(AuthenticationException.class);
    }

    @Test
    @DisplayName("임계 미달에서는 잠기지 않는다 — 보존 규칙이 과해져 정상 사용자를 잠그면 그것대로 결함이다")
    void doesNotLockBeforeThreshold() {
        for (int i = 0; i < maxFailures - 1; i++) {
            final int attempt = i;
            assertThatThrownBy(() -> attemptLogin("wrong-password-" + attempt))
                    .isInstanceOf(AuthenticationException.class);
        }

        User reloaded = userRepository.findByUserId(USER_ID).orElseThrow();
        assertThat(reloaded.isLocked())
                .as("임계 미달인데 잠겼다 — 정상 사용자가 조기 차단된다")
                .isFalse();

        // 잠기지 않았으므로 올바른 비밀번호는 통과해야 하고, 성공하면 카운터가 0 으로 정리된다.
        attemptLogin(RIGHT_PASSWORD);
        assertThat(userRepository.findByUserId(USER_ID).orElseThrow().getLckCnt())
                .as("성공 로그인이 실패 카운터를 초기화하지 않았다")
                .isZero();
    }
}
