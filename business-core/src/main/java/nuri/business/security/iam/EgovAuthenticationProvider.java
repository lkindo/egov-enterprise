package nuri.business.security.iam;

import nuri.business.security.service.EgovPasswordEncoder;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.constants.SecurityConstants;

import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class EgovAuthenticationProvider implements AuthenticationProvider {
    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;
    private final EgovPasswordEncoder egovPasswordEncoder;

    /**
     * 연속 인증 실패 허용 횟수. 이 횟수에 <b>도달</b>하면 계정을 잠근다(기본 5).
     *
     * <p><b>0 이하이면 잠금 기능을 비활성화</b>한다 — 오설정·장애로 정상 사용자가 대량 잠기는
     * 사고를 운영에서 재배포 없이 즉시 회피하기 위한 스위치다(가용성 우선 탈출구).
     */
    @Value("${nuri.security.login.max-failures:5}")
    private int maxLoginFailures;

    /** 잠금 지속(분, 기본 15). 잠금 시각으로부터 이 시간이 지나면 다음 로그인 시도에서 자동 해제된다. */
    @Value("${nuri.security.login.lock-minutes:15}")
    private long lockMinutes;

    /**
     * <b>[트랜잭션 주의] {@code noRollbackFor = BadCredentialsException.class} 는 이 기능의 핵심이다.</b>
     *
     * <p>{@code BadCredentialsException} 은 {@code RuntimeException} 이므로 기본 롤백 규칙에 걸린다.
     * 이 애노테이션이 없으면 실패 경로에서 증가시킨 실패 카운터와 잠금 플래그가 <b>예외와 함께 전부
     * 롤백되어 DB 에 남지 않는다</b>(잠금이 영원히 발동하지 않는 무음 결함). 비밀번호 불일치는
     * 시스템 장애가 아니라 <b>업무적 결과</b>이므로 커밋되어야 한다.
     *
     * <p>계정 잠금 예외({@code AccountStatusException})는 목록에 없으므로 그대로 롤백된다 — 해당
     * 경로는 쓰기가 없어 무해하다.
     */
    @Override
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();
        
        log.debug(">>> [EgovAuthenticationProvider] Authentication attempt received");
        
        try {
            log.debug(">>> [EgovAuthenticationProvider] DB identity lookup started");
            
            User userEntity = userRepository.findByUserId(userId)
                    .or(() -> userRepository.findById(userId))
                    .or(() -> userRepository.findByEsntlId(userId))
                    .orElseThrow(() -> {
                        log.warn(">>> [EgovAuthenticationProvider] Authentication rejected: unknown identity");
                        return new BadCredentialsException("Invalid User ID or Password");
                    });
            
            validateAccountStatus(userEntity);
            
            boolean isMatched = false;
            String encodedPassword = userEntity.getPswd();
            
            // [보안 A09] 비밀번호 해시(저장/유도)는 어떤 레벨로도 로깅하지 않는다. 추적은 userId 만.
            log.debug(">>> [EgovAuthenticationProvider] User found: {}", userEntity.getUserId());
            
            if (encodedPassword != null && (encodedPassword.startsWith("{egov}") || !encodedPassword.startsWith("{"))) {
                String cleanHash = encodedPassword.startsWith("{egov}") ? encodedPassword.substring(6) : encodedPassword;
                
                // Try 1: Using userId as salt
                String generatedHash = egovPasswordEncoder.encode(password, userId);
                log.debug(">>> [EgovAuthenticationProvider] Verifying credential (userId salt)");
                isMatched = cleanHash.equals(generatedHash);
                
                // Try 2: Using esntlId as salt if Try 1 failed (Legacy Egov behavior)
                if (!isMatched && userEntity.getEsntlId() != null) {
                    generatedHash = egovPasswordEncoder.encode(password, userEntity.getEsntlId());
                    log.debug(">>> [EgovAuthenticationProvider] Verifying credential (esntlId salt)");
                    isMatched = cleanHash.equals(generatedHash);
                }
                
                if (isMatched) {
                    log.info(">>> Authentication successful (Egov pattern) for user: {}. Migrating to BCrypt.", userId);
                    // [Security Modernization] 성공적인 로그인 시 BCrypt로 자동 마이그레이션
                    try {
                        String newEncodedPassword = passwordEncoder.encode(password);
                        userEntity.updatePassword(newEncodedPassword);
                        // Save will be handled by @Transactional at the end of method or explicit save
                        userRepository.save(userEntity);
                        log.info(">>> User {} password migrated to BCrypt successfully.", userId);
                    } catch (Exception e) {
                        log.error(">>> Failed to migrate password to BCrypt for user: {}", userId, e);
                    }
                }
            }
            
            if (!isMatched) {
                log.info(">>> [EgovAuthenticationProvider] Trying standard PasswordEncoder.");
                // 저장 해시 파손/인코더 구성 오류는 비밀번호 불일치가 아니라 서비스 장애다.
                // 여기서 삼키면 정상 계정의 잠금 카운터를 올리고 401로 위장하므로 바깥 장애 분류로 보낸다.
                isMatched = passwordEncoder.matches(password, encodedPassword);
            }
            
            if (!isMatched) {
                log.warn(">>> Password mismatch for user: {}", userId);
                userEntity.incrementLockCount();
                // 임계값 도달 → 잠금. lock() 이 잠금 시각까지 남기므로 lockMinutes 경과 후 스스로 풀린다.
                // save() 는 잠금 판정 '뒤'에 와야 lckYn/lckLastPnttm 이 같은 커밋에 함께 실린다.
                Integer failures = userEntity.getLckCnt();
                if (maxLoginFailures > 0 && failures != null && failures >= maxLoginFailures) {
                    userEntity.lock();
                    log.warn(">>> Account locked for user: {} (연속 실패 {}회 도달, {}분 후 자동 해제)",
                            userId, failures, lockMinutes);
                }
                userRepository.save(userEntity);
                throw new BadCredentialsException("Invalid User ID or Password");
            }
            
            userEntity.unlock();
            userRepository.save(userEntity);
            log.info(">>> Authenticating user: {}, esntlId: {}, Inherent Role: {}", 
                    userEntity.getUserId(), userEntity.getEsntlId(), userEntity.getRole());

            String authorCodeFromDb = userAuthorityRepository.findById(userEntity.getEsntlId())
                    .map(ua -> ua.getAuthrtId())
                    .orElse(null);

            log.info(">>> Role from DB table (NEMPLYRSCRTYESTBS): {}", authorCodeFromDb);

            String authorCode;
            if (authorCodeFromDb != null) {
                authorCode = authorCodeFromDb;
            } else {
                authorCode = userEntity.getRole() != null ? userEntity.getRole().name() : SecurityConstants.ROLE_USER;
            }

            if (!authorCode.startsWith(SecurityConstants.ROLE_PREFIX)) {
                authorCode = SecurityConstants.ROLE_PREFIX + authorCode;
            }

            log.info(">>> Final resolved authorCode for user {}: {}", userId, authorCode);
            userEntity.changeRole(nuri.business.domain.user.entity.Role.fromAuthorCode(authorCode));
            CustomUserDetails userDetails = CustomUserDetails.builder()
                    .userId(userEntity.getUserId())
                    .esntlId(userEntity.getEsntlId())
                    .userNm(userEntity.getUserNm())
                    .password(userEntity.getPswd())
                    .roleName(userEntity.getRole() != null ? userEntity.getRole().name() : null)
                    .lockAt(userEntity.getLckYn())
                    .authorCode(authorCode)
                    .build();
            return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
        } catch (AuthenticationException e) {
            // 실패한 로그인 ID와 예외 메시지를 운영 로그에 반복 복제하지 않는다.
            log.warn(">>> Authentication rejected: {}", e.getClass().getSimpleName());
            throw e;
        } catch (Exception e) {
            // DB/인코더 장애를 BadCredentials(401)로 바꾸면 모니터링은 공격으로 오진하고 클라이언트는
            // 잘못된 비밀번호로 오인한다. 또한 noRollbackFor에 걸려 부분 변경이 커밋될 수 있다.
            log.error(">>> Authentication service failure: {}", e.getClass().getSimpleName(), e);
            throw new AuthenticationServiceException("Authentication service unavailable", e);
        }
    }

    /**
     * 계정 잠금 상태 검사 + <b>잠금 기간 만료 시 자동 해제</b>.
     *
     * <p>잠금은 관리자 개입 없이 {@code lockMinutes} 경과 후 스스로 풀려야 한다. 그렇지 않으면
     * 공격자가 임의 계정에 실패를 퍼부어 정상 사용자를 영구 차단하는 DoS 가 성립한다.
     */
    private void validateAccountStatus(User user) {
        if (!user.isLocked()) {
            return;
        }

        if (user.hasLockExpired(Duration.ofMinutes(lockMinutes))) {
            // 잠금 기간 경과 → 해제하고 정상 인증 절차를 계속 진행한다.
            // [의도적] 여기서 별도 save() 를 하지 않는다. 해제된 상태는 이어지는 성공 경로(unlock+save)
            // 또는 실패 경로(카운터 저장)의 커밋에 그대로 실려 영속되므로, 인증 전(前) 단계에서
            // 미인증 요청마다 쓰기를 유발하지 않는 편이 안전하다.
            user.unlock();
            log.info(">>> 잠금 기간 경과로 계정 자동 해제: {}", user.getUserId());
            return;
        }

        // [의도적] 잠긴 상태에서의 재시도는 잠금 시각을 갱신하지 않는다(고정창 방식).
        // 시도할 때마다 연장하면 공격자가 반복 시도만으로 정상 사용자를 무기한 잠글 수 있다.
        throw new AccountStatusException("User account is locked.") {
            private static final long serialVersionUID = 1L;
        };
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
