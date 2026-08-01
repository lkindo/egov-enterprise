package nuri.business.bootstrap;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.constants.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 최초 관리자 비밀번호 프로비저닝.
 *
 * <p>[존재 이유 — W0-02] 운영 마이그레이션 경로에서 알려진 관리자 비밀번호(bcrypt('1'))를 제거하면서
 * {@code R__seed_framework.sql} 은 webmaster 계정을 로그인 불가 sentinel 로 시드한다.
 * 그 상태만 두면 "운영에서 관리자로 진입할 방법이 없다"는 새 결함이 생기므로,
 * 환경변수 {@code ADMIN_INITIAL_PASSWORD} 로 최초 1회 비밀번호를 설정할 경로를 제공한다.
 *
 * <p>[동작 규칙]
 * <ul>
 *   <li>비밀번호가 sentinel({@value #SENTINEL_PREFIX} 로 시작) 일 때만 설정한다.
 *       이미 운영자가 비밀번호를 바꿨다면 절대 덮어쓰지 않는다 — 환경변수가 남아 있다는 이유로
 *       재기동마다 비밀번호가 되돌아가면 그 자체가 백도어다.</li>
 *   <li>환경변수가 없으면 아무것도 하지 않는다. 다만 계정이 아직 sentinel 상태면
 *       "로그인 불가"라는 사실을 기동 로그에 남긴다 — 조용히 넘어가면 운영자가 원인을 찾지 못한다.</li>
 *   <li>비밀번호 값 자체는 어떤 경로로도 로그에 남기지 않는다.</li>
 * </ul>
 *
 * <p>[실행 경로] {@code ApplicationReadyEvent} — Flyway 마이그레이션 완료 이후에 실행된다.
 * 테스트 프로파일에서는 비활성(H2 create-drop 이라 시드 자체가 없다).
 */
@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class AdminPasswordProvisioner {

    /** 로그인 불가 sentinel 의 접두. R__seed_framework.sql 이 넣는 값과 결속된다. */
    static final String SENTINEL_PREFIX = "{disabled}";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_INITIAL_PASSWORD:}")
    private String initialPassword;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void provision() {
        Optional<User> found = userRepository.findById(Constants.User.SYSTEM_ADMIN_ESNTL_ID);
        if (found.isEmpty()) {
            // 시드가 없는 환경(엔티티만 있는 빈 DB 등) — 프로비저닝 대상 자체가 없다.
            return;
        }

        User admin = found.get();
        boolean isSentinel = admin.getPswd() != null && admin.getPswd().startsWith(SENTINEL_PREFIX);

        if (!isSentinel) {
            if (hasInitialPassword()) {
                log.info("[admin-provisioning] 관리자 비밀번호가 이미 설정되어 있어 ADMIN_INITIAL_PASSWORD 를 무시합니다. "
                        + "(재기동마다 비밀번호가 되돌아가는 것을 막기 위한 의도된 동작)");
            }
            return;
        }

        if (!hasInitialPassword()) {
            log.warn("[admin-provisioning] 관리자 계정({})이 로그인 불가 상태입니다. "
                    + "ADMIN_INITIAL_PASSWORD 환경변수를 설정하고 재기동하면 최초 비밀번호가 설정됩니다.",
                    Constants.User.SYSTEM_ADMIN_ESNTL_ID);
            return;
        }

        admin.updatePassword(passwordEncoder.encode(initialPassword));
        userRepository.save(admin);
        log.info("[admin-provisioning] 관리자 계정({}) 최초 비밀번호를 설정했습니다. "
                + "즉시 로그인 후 비밀번호를 변경하고 ADMIN_INITIAL_PASSWORD 환경변수를 제거하십시오.",
                Constants.User.SYSTEM_ADMIN_ESNTL_ID);
    }

    private boolean hasInitialPassword() {
        return initialPassword != null && !initialPassword.isBlank();
    }
}
