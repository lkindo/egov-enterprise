package nuri.business.security.iam;

import nuri.business.security.service.EgovPasswordEncoder;
import nuri.business.security.service.PasswordEncoders;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class EgovAuthenticationProvider implements AuthenticationProvider {
    private final UserRepository userRepository;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final EgovPasswordEncoder egovPasswordEncoder;
    /** 2단계(행 잠금·카운터 반영)만 짧은 쓰기 트랜잭션으로 연다 — 해시 계산은 트랜잭션 밖에서 한다. */
    private final PlatformTransactionManager transactionManager;
    private String unknownIdentityPasswordHash;

    /** 현재 표준 인코더의 비용으로 한 번 준비하며 원문·해시는 출력하지 않는다. */
    @jakarta.annotation.PostConstruct
    void initializeUnknownIdentityPassword() {
        byte[] random = new byte[32];
        new java.security.SecureRandom().nextBytes(random);
        unknownIdentityPasswordHash = passwordEncoder.encode(java.util.Base64.getEncoder().encodeToString(random));
        java.util.Arrays.fill(random, (byte) 0);
        if (unknownIdentityPasswordHash == null || unknownIdentityPasswordHash.isBlank()) {
            throw new IllegalStateException("Password verification configuration is unavailable");
        }
    }

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
     * <b>[트랜잭션 경계] 해시 계산은 DB 연결을 쥐지 않고, 실패 카운터는 자기 트랜잭션에서 커밋한다.</b>
     *
     * <p>1단계(트랜잭션 밖): 사용자를 읽고 비밀번호 해시를 대조한다. bcrypt 대조는 CPU 만 쓰는 수백 ms 작업이다 —
     * 트랜잭션 안에서 하면 그동안 풀 연결을 붙잡아, 로그인이 몰릴 때 연결 풀이 바닥나고 로그인과 상관없는 요청까지
     * 연결 대기 시간 초과로 실패한다(2026-11-15 부하 시험: bcrypt 비용 10→12 뒤 100명 부하에서 풀 대기 초과 829줄).
     * 재해시가 필요하면 새 해시도 여기서 미리 만든다.
     *
     * <p>2단계(짧은 쓰기 트랜잭션): 행을 잠그고 현재 값으로 상태를 다시 판정한 뒤 실패 카운터·잠금·재해시를 반영하고
     * <b>예외를 던지기 전에 커밋한다</b>. 그래서 {@code BadCredentialsException} 이 트랜잭션 밖에서 던져지고,
     * 종전처럼 {@code noRollbackFor} 로 카운터를 지킬 필요가 없다(호출자 트랜잭션이 예외와 함께 카운터를 되돌리던
     * 무음 결함 계열이 구조적으로 없어진다). 잠금 상태 예외는 쓰기 없이 그 트랜잭션을 되돌린다.
     * 호출자가 이미 트랜잭션을 열었으면 2단계는 거기에 참여한다 — 로그인 서비스는 이 경계를 위해 트랜잭션을 열지 않는다.
     */
    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();

        log.debug(">>> [EgovAuthenticationProvider] Authentication attempt received");

        try {
            log.debug(">>> [EgovAuthenticationProvider] DB identity lookup started");

            // [2026-09-27 DEC-OPS-179] 로그인 입력은 로그인 ID 로만 찾는다. 로그인 정책·OTP 는 입력값을 로그인 ID 로
            //   조회하므로(AuthServiceImpl), 여기서 PK·esntlId 로도 찾으면 비밀번호를 아는 사용자가 esntlId 를 넣어
            //   관리자가 건 IP·시간대·접속 제한과 OTP 를 빈 정책으로 통과한다. 토큰 subject(esntlId)의 해석은
            //   이 경로가 아니라 JpaUserAuthAdapter 가 맡는다.
            // 조회도 자기 읽기 트랜잭션 안에서 끝낸다. 트랜잭션 없이 저장소를 부르면 호출자의 빈 트랜잭션 범위(로그인의
            //   NOT_SUPPORTED)에 EntityManager 가 묶여 그 연결을 로그인이 끝날 때까지 쥔다 — 해시 동안 연결을 놓지 않고, 2단계가
            //   연결을 하나 더 요구해 동시 로그인이 풀 크기만큼 모이면 서로를 기다린다(LoginFailureCounterConcurrencyIntegrationTest).
            TransactionTemplate readOnly = new TransactionTemplate(transactionManager);
            readOnly.setReadOnly(true);
            User snapshot = java.util.Optional.ofNullable(readOnly.execute(status -> userRepository.findByUserId(userId).orElse(null)))
                    .orElseThrow(() -> {
                        // 결과에 관계없이 존재하지 않는 계정은 거부한다. 현재 표준 해시의 작업만 동일하게 수행한다.
                        passwordEncoder.matches(password == null ? "" : password, unknownIdentityPasswordHash);
                        log.warn(">>> [EgovAuthenticationProvider] Authentication rejected: unknown identity");
                        return new BadCredentialsException("Invalid User ID or Password");
                    });

            // 잠금 없이 먼저 거른다 — 정지·잠김 계정은 비밀번호 검증과 행 잠금 전에 돌려보낸다.
            //   [2026-11-14] 다만 돌려보내기 전에 없는 계정과 같은 더미 해시를 한 번 계산한다. 해시 없이 바로 거부하면 응답이
            //   해시 시간만큼 빨라, 응답 시간만으로 정지·잠김 계정을 가려낼 수 있다(응답 본문은 이미 같다).
            try {
                validateAccountStatus(snapshot);
            } catch (AuthenticationException rejected) {
                passwordEncoder.matches(password == null ? "" : password, unknownIdentityPasswordHash);
                throw rejected;
            }

            // [보안 A09] 비밀번호 해시(저장/유도)는 어떤 레벨로도 로깅하지 않는다. 추적은 userId 만.
            log.debug(">>> [EgovAuthenticationProvider] User found: {}", snapshot.getUserId());

            String encodedPassword = snapshot.getPswd();
            boolean isMatched = verifyPassword(snapshot, password, encodedPassword);
            if (!isMatched) {
                // 잠금 밖에서 한다 — 잠금을 쥔 채 해시를 더 계산하지 않는다.
                padFailedVerificationWork(password, encodedPassword);
            }
            // 재해시도 잠금·트랜잭션 밖에서 미리 만든다 — 새 해시 계산(비용 12)도 수백 ms 다.
            Rehash rehash = isMatched ? prepareRehash(snapshot, password, encodedPassword) : null;

            String esntlId = new TransactionTemplate(transactionManager).execute(
                    status -> settleUnderRowLock(userId, password, encodedPassword, isMatched, rehash));
            if (esntlId == null) {
                throw new BadCredentialsException("Invalid User ID or Password");
            }

            // 로그인과 JWT/refresh가 동일한 저장소 기반 권한 계산 결과를 사용한다.
            // 표시용 User.role을 다시 쓰거나, 배정 없음에서 USER로 승격하지 않는다.
            var loaded = userDetailsService.loadUserByUsername(esntlId);
            if (!(loaded instanceof CustomUserDetails userDetails)
                    || !esntlId.equals(userDetails.getUsername())) {
                throw new AuthenticationServiceException("Authentication principal contract is invalid");
            }
            new AccountStatusUserDetailsChecker().check(userDetails);
            return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        } catch (AuthenticationException e) {
            // 실패한 로그인 ID와 예외 메시지를 운영 로그에 반복 복제하지 않는다.
            log.warn(">>> Authentication rejected: {}", e.getClass().getSimpleName());
            throw e;
        } catch (Exception e) {
            // DB/인코더 장애를 BadCredentials(401)로 바꾸면 모니터링은 공격으로 오진하고 클라이언트는
            // 잘못된 비밀번호로 오인한다.
            log.error(">>> Authentication service failure: {}", e.getClass().getSimpleName(), e);
            throw new AuthenticationServiceException("Authentication service unavailable", e);
        }
    }

    /**
     * 2단계 — 행 잠금 아래에서 현재 값으로 판정하고 반영한다. 성공이면 esntlId, 비밀번호 불일치면 null(카운터는 이 트랜잭션과
     * 함께 커밋된다). 잠금 상태 예외는 쓰기 없이 트랜잭션을 되돌린다.
     */
    private String settleUnderRowLock(String userId, String password, String encodedPassword, boolean verified,
            Rehash preparedRehash) {
        // [2026-10-18] 실패 횟수의 증가와 잠금 판정은 행 잠금 아래에서 현재 값으로 한다.
        //   종전에는 잠금 없이 읽은 엔티티의 횟수를 메모리에서 올려 저장했다. 같은 계정에 동시에 틀린 비밀번호를 보내면
        //   모두 같은 횟수를 읽고 같은 값을 써서 증가가 사라졌고(lost update), 임계값에 닿아도 잠기지 않거나 허용 횟수보다
        //   더 많이 시도할 수 있었다. 해시 검증은 잠금 밖에서 한다 — 잠금을 쥔 채 해시를 계산하면 같은 계정의 요청이 해시
        //   시간만큼 줄을 선다. 잠근 뒤 상태를 다시 판정하므로, 그 사이 다른 요청이 잠갔으면 이 요청은 잠김으로 끝나고
        //   횟수를 더 올리지 않는다(고정창 유지). 회귀 방어: LoginFailureCounterConcurrencyIntegrationTest.
        User userEntity = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BadCredentialsException("Invalid User ID or Password"));
        userRepository.refreshForUpdate(userEntity);
        validateAccountStatus(userEntity);
        boolean isMatched = verified;
        Rehash rehash = preparedRehash;
        if (!java.util.Objects.equals(encodedPassword, userEntity.getPswd())) {
            // 해시 검증과 잠금 사이에 비밀번호가 바뀌었다 — 옛 해시와 맞은 결과로 판정하지 않는다(드문 경로라 잠금 안에서 다시 대조).
            isMatched = verifyPassword(userEntity, password, userEntity.getPswd());
            rehash = isMatched ? prepareRehash(userEntity, password, userEntity.getPswd()) : null;
        }

        if (isMatched) {
            // 재해시는 잠금·재조회 뒤에 반영한다 — refresh 가 메모리 변경을 버리기 때문이다.
            if (rehash != null) {
                // 비밀번호 자체는 같다 — 자격 변경 시각을 바꾸면 다른 기기의 세션까지 끊긴다(User#rehashPassword).
                userEntity.rehashPassword(rehash.hash());
                log.info(">>> Password rehashed ({}) for user: {}", rehash.reason(), userEntity.getUserId());
            }
            userEntity.unlockAccount();
            userRepository.save(userEntity);
            return userEntity.getEsntlId();
        }

        log.warn(">>> Password mismatch for user: {}", userId);
        userEntity.incrementLockCount();
        // 임계값 도달 → 잠금. lockAccount()가 잠금 시각까지 남기므로 lockMinutes 경과 후 스스로 풀린다.
        // save() 는 잠금 판정 '뒤'에 와야 lckYn/lckLastPnttm 이 같은 커밋에 함께 실린다.
        Integer failures = userEntity.getLckCnt();
        boolean locked = maxLoginFailures > 0 && failures != null && failures >= maxLoginFailures;
        if (locked) {
            userEntity.lockAccount();
            log.warn(">>> Account locked for user: {} (연속 실패 {}회 도달, {}분 후 자동 해제)",
                    userId, failures, lockMinutes);
        }
        // [2026-11-17 DEC-OPS-419] 로그인 실패로 건 잠금은 비밀번호·MFA 대조만 막고 이미 받은 세션은 끊지 않는다.
        //   로그인 실패는 인증 없이 누구나 낼 수 있다 — 종전처럼 여기서 세션차수를 올리면 로그인 ID 만 아는 사람이
        //   잠금 시간마다 다섯 번 틀려 관리자를 계속 쫓아낼 수 있었다. 세션을 가진 쪽이 현재 비밀번호를 대입해 건
        //   잠금(비밀번호 변경, DEC-OPS-418)은 그 세션이 의심스러우므로 UserService 가 세션차수를 올린다.
        userRepository.save(userEntity);
        return null;
    }

    /** 미리 만든 새 해시와 그 사유. 원문·해시는 로그에 남기지 않는다. */
    private record Rehash(String hash, String reason) {
    }

    /**
     * 성공 로그인의 투명 재해시를 미리 계산한다 — 옛 eGov 해시이거나 현재 표준 인코더의 비용·형식 정책이 올라간 경우다.
     * 재해시는 방어 심화 작업이라 실패해도 로그인을 막지 않는다(다음 로그인에서 다시 시도한다).
     */
    private Rehash prepareRehash(User user, String rawPassword, String encodedPassword) {
        String reason = isLegacyPassword(encodedPassword) ? "legacy eGov" : "standard policy upgrade";
        try {
            if (!isLegacyPassword(encodedPassword) && !passwordEncoder.upgradeEncoding(encodedPassword)) {
                return null;
            }
            return new Rehash(passwordEncoder.encode(rawPassword), reason);
        } catch (Exception e) {
            // 호환 로그인은 유지한다. 다음 로그인에서 재시도할 수 있도록 기존 해시는 그대로 둔다.
            log.error(">>> Password rehash failed ({}) for user: {}", reason, user.getUserId(), e);
            return null;
        }
    }

    /**
     * 입력 비밀번호를 저장 해시와 대조한다. 상태를 바꾸지 않는다(재해시는 호출자가 행을 잠근 뒤에 한다).
     *
     * <p>저장 해시 파손·인코더 구성 오류는 비밀번호 불일치가 아니라 서비스 장애다. 여기서 삼키면 정상 계정의 잠금 카운터를
     * 올리고 401로 위장하므로 예외를 그대로 바깥 장애 분류로 보낸다.
     */
    private boolean verifyPassword(User userEntity, String password, String encodedPassword) {
        if (!isLegacyPassword(encodedPassword)) {
            log.info(">>> [EgovAuthenticationProvider] Trying standard PasswordEncoder.");
            return passwordEncoder.matches(password, encodedPassword);
        }
        String cleanHash = encodedPassword.startsWith("{egov}") ? encodedPassword.substring(6) : encodedPassword;
        // Try 1: userId salt. EgovPasswordEncoder.matches 는 상수시간 비교를 사용한다.
        log.debug(">>> [EgovAuthenticationProvider] Verifying credential (userId salt)");
        boolean matched = egovPasswordEncoder.matches(password, cleanHash, userEntity.getUserId());
        // Try 2: Using esntlId as salt if Try 1 failed (Legacy Egov behavior)
        if (!matched && userEntity.getEsntlId() != null) {
            log.debug(">>> [EgovAuthenticationProvider] Verifying credential (esntlId salt)");
            matched = egovPasswordEncoder.matches(password, cleanHash, userEntity.getEsntlId());
        }
        return matched;
    }

    /** 실패 경로 작업량 맞춤용 검증기 — bcrypt 는 비용을 해시에서 읽으므로 이 인코더의 강도는 결과와 시간에 상관없다. */
    private static final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder PADDING_VERIFIER =
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    private static final java.util.regex.Pattern STANDARD_BCRYPT_COST =
            java.util.regex.Pattern.compile("^\\{bcrypt}\\$2[abxy]?\\$(\\d{2})\\$");

    /** bcrypt 가 받는 가장 낮은 비용. 이보다 낮은 값은 해시가 아니므로 맞추지 않는다. */
    private static final int MIN_BCRYPT_COST = 4;

    /** 비용별 더미 해시. 처음 쓸 때 한 번만 만든다(낮은 비용이라 싸다). */
    private final java.util.Map<Integer, String> lowerCostDummies = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * [2026-11-14] 비밀번호가 틀린 경로의 해시 작업량을 현재 표준 비용({@link PasswordEncoders#BCRYPT_STRENGTH})에 맞춘다.
     *
     * <p>없는 계정·정지·잠긴 계정은 현재 비용의 더미 해시를 한 번 검증한다. 저장 해시가 더 싼 계정(재해시 전의 낮은 비용 bcrypt,
     * 옛 SHA-256)은 틀린 비밀번호에 그만큼 빨리 답해, 응답 시간만으로 "아직 전환하지 않은 활성 계정" 을 가려낼 수 있었다 — 실패
     * 로그인은 재해시하지 않으므로 그 차이는 계정이 성공 로그인할 때까지 남는다. 그래서 모자란 만큼 같은 비용의 더미 해시를 더
     * 검증한다(bcrypt 작업량은 비용이 1 오를 때 두 배다). 결과는 버린다 — 판정은 이미 끝났다.
     */
    private void padFailedVerificationWork(String password, String encodedPassword) {
        String raw = password == null ? "" : password;
        if (isLegacyPassword(encodedPassword)) {
            passwordEncoder.matches(raw, unknownIdentityPasswordHash);
            return;
        }
        int cost = standardBcryptCost(encodedPassword);
        int rounds = paddingVerifications(cost);
        if (rounds == 0) {
            return;
        }
        String dummy = lowerCostDummies.computeIfAbsent(cost,
                c -> new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(c).encode(randomSecret()));
        for (int i = 0; i < rounds; i++) {
            PADDING_VERIFIER.matches(raw, dummy);
        }
    }

    /** {@code {bcrypt}$2a$NN$...} 의 비용. 표준 bcrypt 가 아니면 -1. */
    static int standardBcryptCost(String encodedPassword) {
        if (encodedPassword == null) {
            return -1;
        }
        java.util.regex.Matcher matcher = STANDARD_BCRYPT_COST.matcher(encodedPassword);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : -1;
    }

    /** 비용 {@code cost} 해시를 몇 번 더 검증해야 현재 표준 비용 한 번과 작업량이 같은가. 맞출 필요가 없으면 0. */
    static int paddingVerifications(int cost) {
        if (cost < MIN_BCRYPT_COST || cost >= PasswordEncoders.BCRYPT_STRENGTH) {
            return 0;
        }
        return (1 << (PasswordEncoders.BCRYPT_STRENGTH - cost)) - 1;
    }

    private static String randomSecret() {
        byte[] random = new byte[32];
        new java.security.SecureRandom().nextBytes(random);
        try {
            return java.util.Base64.getEncoder().encodeToString(random);
        } finally {
            java.util.Arrays.fill(random, (byte) 0);
        }
    }

    /** {@code {egov}} 표식 또는 표식 없는 기존 SHA-256 해시는 레거시 검증 경로로만 처리한다. */
    private boolean isLegacyPassword(String encodedPassword) {
        return encodedPassword != null
                && (encodedPassword.startsWith("{egov}") || !encodedPassword.startsWith("{"));
    }

    /**
     * 계정 잠금 상태 검사 + <b>잠금 기간 만료 시 자동 해제</b>.
     *
     * <p>잠금은 관리자 개입 없이 {@code lockMinutes} 경과 후 스스로 풀려야 한다. 그렇지 않으면
     * 공격자가 임의 계정에 실패를 퍼부어 정상 사용자를 영구 차단하는 DoS 가 성립한다.
     */
    private void validateAccountStatus(User user) {
        if (!"P".equals(user.getUserSttsCd())) {
            throw new DisabledException("User account is not active");
        }
        if (!user.isLocked()) {
            return;
        }

        if (user.hasLockExpired(Duration.ofMinutes(lockMinutes))) {
            // 잠금 기간 경과 → 해제하고 정상 인증 절차를 계속 진행한다.
            // [의도적] 여기서 별도 save() 를 하지 않는다. 해제된 상태는 이어지는 성공 경로(unlock+save)
            // 또는 실패 경로(카운터 저장)의 커밋에 그대로 실려 영속되므로, 인증 전(前) 단계에서
            // 미인증 요청마다 쓰기를 유발하지 않는 편이 안전하다.
            user.unlockAccount();
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
