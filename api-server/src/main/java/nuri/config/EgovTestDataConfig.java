package nuri.config;

import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 테스트용 데이터 초기화 설정
 * - 운영(prod) 환경을 제외한 개발/테스트 환경에서만 동작
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@Profile("!prod & !test")
public class EgovTestDataConfig {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    @Transactional
    public void initTestData() {
        createTestUser("webmaster", "관리자", "ROLE_ADMIN", "USRCNFRM_00000000001");
        createTestUser("user_regular", "일반사용자", "ROLE_USER", "USRCNFRM_00000000002");
    }

    private void createTestUser(String userId, String userNm, String role, String esntlId) {
        userRepository.findById(userId).ifPresentOrElse(user -> {
            log.info(">>> Resetting password for existing test user: {}", userId);
            user.updatePassword(passwordEncoder.encode("1"));
            userRepository.save(user);
        }, () -> {
            log.info(">>> Creating test user: {} (Role: {})", userId, role);

            User user = User.builder()
                    .userId(userId)
                    .password(passwordEncoder.encode("1"))
                    .userNm(userNm)
                    .esntlId(esntlId)
                    .homeadres("Seoul")
                    .passwordHint("P01")
                    .passwordCnsr("Hint Answer")
                    .homeendTelno("0000")
                    .areaNo("02")
                    .homemiddleTelno("0000")
                    .zip("000000")
                    .empStatus("P")
                    .sbscrbDe(LocalDateTime.now())
                    .build();

            userRepository.save(user);

            UserAuthority authority = UserAuthority.builder()
                    .uniqId(esntlId)
                    .authorCode(role)
                    .build();

            userAuthorityRepository.save(authority);
            log.info(">>> Test user created successfully: {}", userId);
        });
    }
}
