package nuri.business.security.iam;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 로그인 실패 카운트/계정 잠금을 별도(REQUIRES_NEW) 트랜잭션으로 영속화한다.
 *
 * <p>인증 실패는 {@code BadCredentialsException}(RuntimeException) 을 던져 인증 트랜잭션을
 * 롤백시키므로, 실패 카운트 증가를 인증 트랜잭션 안에서 저장하면 롤백에 휩쓸려 사라진다(BE-01).
 * 이 서비스는 프록시를 통해 호출되어 독립 트랜잭션으로 즉시 커밋하므로, 실패가 누적되어
 * 임계값에서 계정이 실제로 잠긴다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String userId) {
        userRepository.findByUserId(userId)
                .or(() -> userRepository.findById(userId))
                .or(() -> userRepository.findByEsntlId(userId))
                .ifPresent(user -> {
                    user.incrementLockCount();
                    userRepository.save(user);
                    log.warn(">>> [Lockout] Failure recorded for {} (count={}, locked={})",
                            userId, user.getLckCnt(), user.getLckYn());
                });
    }
}
