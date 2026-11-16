package nuri.foundation.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Header;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.InvalidKeyException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import nuri.foundation.security.constants.SecurityConstants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import javax.crypto.SecretKey;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.Key;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECFieldFp;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret:}")
    private String secretKey;

    @Value("${jwt.signing.active-kid:}")
    private String signingActiveKid;

    @Value("${jwt.signing.keys-json:}")
    private String signingKeysJson;

    @Value("${jwt.accept-legacy-hmac:true}")
    private boolean acceptLegacyHmac = true;

    @Value("${jwt.cookie.secure:false}")
    private boolean cookieSecure;

    /**
     * 액세스 토큰 수명(ms). 기본 1시간 — **운영 기본값은 종전과 동일하며 바꾸지 않는다.**
     *
     * [설정으로 뺀 이유 / 2026-07-28] 종전에는 상수였고, 그 결과 **E2E 전체 실행이 이 수명을
     * 넘기면 그 시점 이후의 모든 테스트가 한꺼번에 죽었다.** Playwright 는 setup 에서 storageState
     * 를 한 번만 만들고 재발급하지 않으며, 프론트 미들웨어는 exp 경과 시 재발급을 시도하지 않고
     * 곧바로 /login 으로 돌린다(middleware.ts). 그래서 증상이 "셀렉터를 못 찾음"으로 나타나
     * 원인이 전혀 달라 보인다 — 실제로 렌더된 것은 대상 화면이 아니라 로그인 폼이다.
     *
     * 실측(2026-07-28, CI run 30279822185): shard 2 가 **66분** 걸렸고 04 후반부터 05·06·07 이
     * 통째로 red 였다. 만료 토큰을 주입해 동일 증상을 재현·확증했다.
     * 러너가 느려질수록 더 많은 테스트가 만료 구간에 들어가는 구조라, 테스트를 개별로 고쳐도
     * 재발한다. E2E 환경에서만 수명을 늘릴 수 있도록 주입 지점을 만든다.
     *
     * ⚠ **필드 초기화값을 반드시 함께 유지한다.** `@Value` 는 Spring 이 주입할 때만 채워지므로,
     * 컨텍스트 없이 `new JwtTokenProvider()` 로 만드는 경로(단위 테스트 등)에서는 0 이 되어
     * **토큰이 발급 즉시 만료된다**. 실측(2026-07-28): 상수를 @Value 로 바꾸면서 초기화값을
     * 빠뜨려 JwtTokenProviderTest 3건이 `ExpiredJwtException: JWT expired 716 milliseconds ago`
     * 로 깨졌다. 컴파일은 통과하므로 `compileTestJava` 만으로는 잡히지 않는다.
     */
    @Value("${jwt.access-token-validity-ms:3600000}")
    private long accessTokenValidityInMilliseconds = 3600000L; // 1 hour

    /** 리프레시 토큰 수명(ms). 기본 7일. 위와 같은 이유로 초기화값을 유지한다. */
    @Value("${jwt.refresh-token-validity-ms:604800000}")
    private long refreshTokenValidityInMilliseconds = 604800000L; // 7 days

    private SecretKey key;
    private String activeSigningKid;
    private ECPrivateKey activeSigningKey;
    private Map<String, ECPublicKey> ecVerifyKeys = Map.of();
    private Map<String, String> ecPublicKeyFingerprints = Map.of();

    /**
     * 활성 프로파일. 운영에서 <b>공개된 dev 시크릿</b>을 거부하기 위해서만 쓴다.
     * (주입 실패 시 빈 배열이라 검사가 조용히 꺼진다 — 그 경우는 아래 §운영 여부 판정 참조.)
     */
    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    /**
     * 저장소에 커밋된 개발 기본 시크릿의 SHA-256. [W0-P0-4-c 보완 — 2026-08-03]
     *
     * <p>값 자체를 상수로 두면 이 파일이 또 하나의 노출 지점이 되므로 해시만 둔다.
     * (원본은 docker-compose.yml · application.yml · frontend/src/proxy.ts 에 있는 그 값이다.)
     *
     * <p>[왜 필요한가] 종전 prod 방어는 {@code ${JWT_SECRET}} 무기본값 fail-fast 뿐이었다.
     * 그것이 검사하는 것은 <b>변수의 존재</b>이지 <b>값의 안전성</b>이 아니다 —
     * 운영자가 저장소에 커밋된 그 값을 그대로 {@code JWT_SECRET} 에 주입하면 prod 가 정상 기동한다.
     * 공개 저장소이므로 그 상태는 "누구나 임의 esntlId 로 토큰을 위조할 수 있음" 과 같다.
     */
    private static final String DEV_SECRET_SHA256 =
            "650ca76f50223962b2c5aff96509b5dbfe4e4f8d8ee48b41ce258f9ee3bafe91";

    private static final String DEV_ES256_KID = "dev-es256-1";
    /** ADR-0060: 로컬/개발 전용 ES256(P-256) 키쌍. prod 프로파일에서는 기동을 차단한다. */
    private static final String DEV_ES256_PKCS8_B64 =
            "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTnpdEj1q4iQ2/WkcXWQKoNX1oKrCfYXvtd4zn0Fz8aShRANCAAQUKQual8uBBSoNZbPMEB1Xugo7se+2W2K+Tg+Uagxr52f7qbK5aPoRzJF0UW+bQKBaEiKqm6MxjuUFTkuakoaz";
    private static final String DEV_ES256_SPKI_SHA256 =
            "3989a5f13aecbbfa7f7d7156774046dcb86d27b4815459e6555c207e421b35d4";
    private static final int MAX_SIGNING_KEYS = 16;
    private static final String KID_PATTERN = "^[A-Za-z0-9._-]{1,64}$";

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private UserDetailsService userDetailsService;

    @PostConstruct
    protected void init() {
        // [2026-07-28] 수명이 0 이하면 토큰이 발급 즉시 만료돼 "로그인은 되는데 곧바로 /login" 이라는
        //   원인을 알 수 없는 증상이 된다. 조용히 통과시키지 않고 기동 시점에 즉시 실패시킨다.
        if (accessTokenValidityInMilliseconds <= 0 || refreshTokenValidityInMilliseconds <= 0) {
            throw new IllegalStateException("JWT token validity must be positive (access="
                    + accessTokenValidityInMilliseconds + "ms, refresh="
                    + refreshTokenValidityInMilliseconds + "ms)");
        }
        if (acceptLegacyHmac) {
            if (secretKey == null || secretKey.trim().isEmpty()) {
                throw new IllegalStateException("JWT Secret is not configured.");
            }
            rejectCommittedDevSecretInProduction();
            this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
            log.info("JWT secret fingerprint = {} (sha256[:8], 값 아님)", secretFingerprint());
        } else {
            this.key = null;
        }
        configureAsymmetricKeyring();
        log.info("JWT ES256 activeKid={}, verifyKeyFingerprints={} (spki sha256[:8], 값 아님), acceptLegacyHmac={}",
                activeSigningKid, ecPublicKeyFingerprints, acceptLegacyHmac);
    }

    private boolean isProdProfile() {
        return activeProfiles != null
                && Arrays.stream(activeProfiles.split(","))
                        .map(String::trim)
                        .anyMatch("prod"::equalsIgnoreCase);
    }

    private void configureAsymmetricKeyring() {
        boolean noKid = signingActiveKid == null || signingActiveKid.isBlank();
        boolean noKeys = signingKeysJson == null || signingKeysJson.isBlank();
        if (noKid != noKeys) {
            throw new IllegalStateException(
                    "JWT signing active-kid and keys-json must both be set or both omitted");
        }
        boolean prod = isProdProfile();
        String resolvedKid;
        Map<String, String> encodedKeys;
        if (noKid) {
            if (prod) {
                throw new IllegalStateException(
                        "[SECURITY] 운영(prod) 프로파일에는 JWT_SIGNING_ACTIVE_KID 와 JWT_SIGNING_KEYS_JSON 을 설정해야 합니다.");
            }
            resolvedKid = DEV_ES256_KID;
            encodedKeys = Map.of(DEV_ES256_KID, DEV_ES256_PKCS8_B64);
        } else {
            resolvedKid = signingActiveKid;
            encodedKeys = parseSigningKeysJson(signingKeysJson);
            if (!resolvedKid.matches(KID_PATTERN) || !encodedKeys.containsKey(resolvedKid)) {
                throw new IllegalStateException("Invalid JWT signing keyring: active-kid missing or malformed");
            }
        }
        ECParameterSpec p256Spec = canonicalP256Spec();
        Map<String, ECPrivateKey> privMap = new LinkedHashMap<>();
        Map<String, ECPublicKey> pubMap = new LinkedHashMap<>();
        Map<String, String> fpMap = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : encodedKeys.entrySet()) {
            String kid = entry.getKey();
            if (!kid.matches(KID_PATTERN) || entry.getValue() == null || entry.getValue().isBlank()) {
                throw new IllegalStateException("Invalid JWT signing key entry");
            }
            ECPrivateKey ecPriv = decodeP256PrivateKey(entry.getValue(), p256Spec);
            ECPublicKey ecPub = deriveP256PublicKey(ecPriv, p256Spec);
            String spkiHash = sha256Hex(ecPub.getEncoded());
            String fp = spkiHash.substring(0, 8);
            if (prod && DEV_ES256_SPKI_SHA256.equals(spkiHash)) {
                throw new IllegalStateException(
                        "[SECURITY] 운영(prod) 프로파일에 저장소에 커밋된 개발용 JWT 서명키를 사용할 수 없습니다. fingerprint=" + fp);
            }
            privMap.put(kid, ecPriv);
            pubMap.put(kid, ecPub);
            fpMap.put(kid, fp);
        }
        this.activeSigningKid = resolvedKid;
        this.activeSigningKey = Objects.requireNonNull(privMap.get(resolvedKid));
        this.ecVerifyKeys = Map.copyOf(pubMap);
        this.ecPublicKeyFingerprints = Map.copyOf(fpMap);
    }

    private static Map<String, String> parseSigningKeysJson(String rawJson) {
        try {
            var node = JsonMapper.builder().build().readTree(rawJson);
            if (!node.isObject() || node.size() < 1 || node.size() > MAX_SIGNING_KEYS) {
                throw new IllegalStateException("Invalid JWT signing keyring JSON");
            }
            Map<String, String> keys = new LinkedHashMap<>();
            for (var entry : node.properties()) {
                if (!entry.getValue().isString()) {
                    throw new IllegalStateException("Invalid JWT signing keyring value");
                }
                keys.put(entry.getKey(), entry.getValue().asString());
            }
            return keys;
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Invalid JWT signing keyring JSON", ex);
        }
    }

    private static ECParameterSpec canonicalP256Spec() {
        try {
            AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
            params.init(new ECGenParameterSpec("secp256r1"));
            return params.getParameterSpec(ECParameterSpec.class);
        } catch (Exception ex) {
            throw new IllegalStateException("P-256 curve parameters unavailable", ex);
        }
    }

    private static ECPrivateKey decodeP256PrivateKey(String pkcs8Base64, ECParameterSpec p256) {
        byte[] der;
        try {
            der = Base64.getDecoder().decode(pkcs8Base64.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Invalid base64 in JWT signing key", ex);
        }
        try {
            PrivateKey priv = KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(der));
            if (!(priv instanceof ECPrivateKey ecPriv)) {
                throw new IllegalStateException("JWT signing key is not EC");
            }
            ECParameterSpec spec = ecPriv.getParams();
            if (!(spec.getCurve().getField() instanceof ECFieldFp fp) || fp.getFieldSize() != 256
                    || !p256.getOrder().equals(spec.getOrder())
                    || !p256.getGenerator().equals(spec.getGenerator())
                    || p256.getCofactor() != spec.getCofactor()) {
                throw new IllegalStateException("JWT signing key must use NIST P-256");
            }
            BigInteger s = ecPriv.getS();
            if (s.signum() <= 0 || s.compareTo(p256.getOrder()) >= 0) {
                throw new IllegalStateException("JWT signing key scalar out of range");
            }
            return ecPriv;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid PKCS#8 EC private key for JWT signing", ex);
        } finally {
            Arrays.fill(der, (byte) 0);
        }
    }

    private static ECPublicKey deriveP256PublicKey(ECPrivateKey ecPriv, ECParameterSpec p256) {
        try {
            BigInteger prime = ((ECFieldFp) p256.getCurve().getField()).getP();
            BigInteger a = p256.getCurve().getA();
            ECPoint w = ecMultiply(p256.getGenerator(), ecPriv.getS(), prime, a);
            PublicKey pub = KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(w, p256));
            return (ECPublicKey) pub;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to derive EC public key from private key", ex);
        }
    }

    private static ECPoint ecMultiply(ECPoint g, BigInteger k, BigInteger p, BigInteger a) {
        ECPoint result = ECPoint.POINT_INFINITY;
        ECPoint addend = g;
        for (int i = 0; i < k.bitLength(); i++) {
            if (k.testBit(i)) {
                result = ecAdd(result, addend, p, a);
            }
            addend = ecAdd(addend, addend, p, a);
        }
        return result;
    }

    private static ECPoint ecAdd(ECPoint p1, ECPoint p2, BigInteger p, BigInteger a) {
        if (ECPoint.POINT_INFINITY.equals(p1)) return p2;
        if (ECPoint.POINT_INFINITY.equals(p2)) return p1;
        BigInteger x1 = p1.getAffineX();
        BigInteger y1 = p1.getAffineY();
        BigInteger x2 = p2.getAffineX();
        BigInteger y2 = p2.getAffineY();
        BigInteger lambda;
        if (x1.equals(x2)) {
            if (!y1.equals(y2) || y1.signum() == 0) {
                return ECPoint.POINT_INFINITY;
            }
            lambda = x1.multiply(x1).multiply(BigInteger.valueOf(3)).add(a)
                    .multiply(y1.shiftLeft(1).modInverse(p)).mod(p);
        } else {
            lambda = y2.subtract(y1).multiply(x2.subtract(x1).modInverse(p)).mod(p);
        }
        BigInteger x3 = lambda.multiply(lambda).subtract(x1).subtract(x2).mod(p);
        BigInteger y3 = lambda.multiply(x1.subtract(x3)).subtract(y1).mod(p);
        return new ECPoint(x3, y3);
    }

    /**
     * 운영에서 <b>저장소에 커밋된 dev 시크릿</b>을 거부한다. [W0-P0-4-c 보완]
     *
     * <p>{@code ${JWT_SECRET}} 무기본값 fail-fast 는 <b>변수가 있는가</b>만 본다. 공개 저장소의
     * 그 값을 그대로 주입하면 통과한다 — 그 상태에서는 누구나 임의 {@code esntlId} 를 subject 로 하는
     * 토큰을 위조할 수 있으므로, 인증 체계 전체가 무의미해진다. 값 수준에서 막는다.
     *
     * <p>[왜 운영에서만] dev·test·e2e 는 그 값을 <b>일부러</b> 쓴다(백엔드와 프론트 미들웨어가 같은
     * raw bytes 로 HMAC 해야 로그인이 성립한다). 전 프로파일에서 막으면 개발·CI 가 통째로 멈춘다.
     *
     * <p>[판정 불가는 통과로 두지 않는다] 활성 프로파일을 읽지 못하면(빈 문자열) 운영 여부를 알 수 없다.
     * 그러나 이 경우를 실패로 다루면 프로파일 없이 뜨는 정상 개발 경로가 막히므로, <b>경고를 남기고</b>
     * 통과시킨다 — 대신 그 경고가 로그에 남아 사후 추적이 가능하다.
     * (운영 배포가 프로파일 없이 뜨는 경로는 {@code ConfigSafetyLinterTest} 가 별도로 차단한다.)
     */
    private void rejectCommittedDevSecretInProduction() {
        if (!isProdProfile()) {
            return;
        }
        if (DEV_SECRET_SHA256.equals(fullSecretHash())) {
            throw new IllegalStateException(
                    "[SECURITY] 운영(prod) 프로파일에 **저장소에 커밋된 개발용 JWT_SECRET** 이 주입되었습니다. "
                    + "이 값은 공개 저장소에 있으므로 누구나 임의 사용자로 토큰을 위조할 수 있습니다. "
                    + "JWT_SECRET 을 새로 생성한 값으로 교체하십시오 "
                    + "(예: openssl rand -base64 64). fingerprint=" + secretFingerprint());
        }
    }

    /** 시크릿의 SHA-256 전체(16진). 비교 전용이며 로그에 남기지 않는다. */
    private String fullSecretHash() {
        if (secretKey == null) return "";
        return sha256Hex(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256Hex(byte[] input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(input);
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 을 사용할 수 없어 키 해시를 계산할 수 없습니다.", e);
        }
    }

    /**
     * 시크릿의 SHA-256 앞 8자. 값 자체는 절대 로그에 남기지 않는다.
     *
     * [존재 이유] 프론트 프록시(frontend/src/proxy.ts)가 같은 규칙으로 지문을 찍는다.
     * 두 지문이 다르면 좌우 시크릿 비대칭이고, 그 상태에서는 서명 검증이 전량 실패해
     * "로그인은 200 인데 페이지 진입에서 /login 으로 되돌아가는" 무음 루프가 된다(2026-07-19 발생).
     * 그때 원인을 알려주는 신호가 어디에도 없어 오래 헤맸기에, 양쪽에 대조 가능한 지문을 남긴다.
     */
    private String secretFingerprint() {
        String full = fullSecretHash();
        return full.length() >= 8 ? full.substring(0, 8) : "";
    }

    /**
     * 토큰 종류 클레임. [W1-06]
     *
     * <p>이 클레임이 없던 동안 <b>7일짜리 리프레시 토큰을 그대로 {@code Authorization: Bearer} 로
     * 사용할 수 있었다</b> — 두 토큰이 같은 키로 서명되고 구조가 같아 구분할 근거가 없었기 때문이다.
     */
    private static final String CLAIM_TOKEN_TYPE = "typ";
    /** 세션차수 클레임(V2_153). 이 값이 사용자의 현재 차수와 다르면 토큰을 거부한다. 없는 토큰(이전 발급분)은 0 으로 읽는다. */
    private static final String CLAIM_SESSION_CYCLE = "ssn";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    public String createAccessToken(String userId, String role) {
        return createAccessToken(userId, role, null, null);
    }

    public String createAccessToken(String userId, String role, String mfaVersion, java.time.Instant verifiedAt) {
        return createAccessToken(userId, role, mfaVersion, verifiedAt, null);
    }

    /** 세션차수를 담아 발급한다(V2_153). {@code sessionCycle} 이 null 이면 클레임을 싣지 않는다(0 으로 읽힌다). */
    public String createAccessToken(String userId, String role, String mfaVersion, java.time.Instant verifiedAt,
            Integer sessionCycle) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessTokenValidityInMilliseconds);
        return Jwts.builder()
                .header().keyId(activeSigningKid).and()
                .subject(userId)
                .claim("role", role)
                .claim(CLAIM_TOKEN_TYPE, TYPE_ACCESS)
                .claim("mfa_v", mfaVersion)
                .claim("mfa_at", verifiedAt == null ? null : verifiedAt.getEpochSecond())
                .claim(CLAIM_SESSION_CYCLE, sessionCycle)
                .issuedAt(now)
                .expiration(validity)
                .signWith(activeSigningKey, Jwts.SIG.ES256)
                .compact();
    }

    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId) {
        return createRefreshToken(userId, new Date(System.currentTimeMillis() + refreshTokenValidityInMilliseconds));
    }

    /**
     * 만료 시각을 명시해 리프레시 토큰을 발급한다. [W1-06 회전용]
     *
     * <p>회전 시 <b>절대 만료를 유지</b>하기 위해 존재한다. 회전할 때마다 수명을 새로 7일 주면
     * 탈취된 토큰이 무기한 연장되어(슬라이딩 세션) 회전의 목적이 사라진다.
     * 최초 로그인 시점에 정해진 만료를 그대로 물려준다.
     */
    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId, Date expiresAt) {
        return createRefreshToken(userId, expiresAt, null, null);
    }

    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId,
            String mfaVersion, java.time.Instant verifiedAt) {
        return createRefreshToken(userId, new Date(System.currentTimeMillis() + refreshTokenValidityInMilliseconds),
                mfaVersion, verifiedAt);
    }

    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId, Date expiresAt,
            String mfaVersion, java.time.Instant verifiedAt) {
        return createRefreshToken(userId, expiresAt, mfaVersion, verifiedAt, null);
    }

    /** 세션차수를 담아 새 수명으로 발급한다(V2_153, 로그인). */
    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId,
            String mfaVersion, java.time.Instant verifiedAt, Integer sessionCycle) {
        return createRefreshToken(userId, new Date(System.currentTimeMillis() + refreshTokenValidityInMilliseconds),
                mfaVersion, verifiedAt, sessionCycle);
    }

    /** 세션차수를 담아 발급한다(V2_153). 재발급은 저장된 refresh token 의 절대 만료를 물려준다. */
    public String createRefreshToken(@org.jspecify.annotations.NonNull String userId, Date expiresAt,
            String mfaVersion, java.time.Instant verifiedAt, Integer sessionCycle) {
        return Jwts.builder()
                .header().keyId(activeSigningKid).and()
                .subject(userId)
                .claim(CLAIM_TOKEN_TYPE, TYPE_REFRESH)
                .claim("mfa_v", mfaVersion)
                .claim("mfa_at", verifiedAt == null ? null : verifiedAt.getEpochSecond())
                .claim(CLAIM_SESSION_CYCLE, sessionCycle)
                .issuedAt(new Date())
                .expiration(expiresAt)
                .signWith(activeSigningKey, Jwts.SIG.ES256)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .keyLocator(this::locateVerificationKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Key locateVerificationKey(Header header) {
        if (!(header instanceof JwsHeader jwsHeader)) {
            throw new UnsupportedJwtException("Signed JWS header is required");
        }
        String alg = jwsHeader.getAlgorithm();
        if ("ES256".equals(alg)) {
            String kid = jwsHeader.getKeyId();
            if (kid == null || kid.isBlank()) {
                throw new InvalidKeyException("Missing ES256 kid header");
            }
            ECPublicKey verifyKey = ecVerifyKeys.get(kid);
            if (verifyKey == null) {
                throw new InvalidKeyException("Unknown ES256 kid: " + kid);
            }
            return verifyKey;
        }
        if (acceptLegacyHmac && key != null
                && ("HS256".equals(alg) || "HS384".equals(alg) || "HS512".equals(alg))) {
            return key;
        }
        throw new UnsupportedJwtException("Unsupported JWT algorithm: " + alg);
    }

    public Authentication getAuthentication(String token) {
        var claims = parseClaims(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(
                Objects.requireNonNull(claims.getSubject(), "Subject in JWT token cannot be null"));
        new org.springframework.security.authentication.AccountStatusUserDetailsChecker().check(userDetails);
        rejectIfIssuedBeforeCredentialChange(claims.getIssuedAt(), userDetails);
        rejectIfIssuedBeforeLogout(claims.getIssuedAt(), userDetails);
        assertSessionCycle(userDetails, sessionCycle(claims));
        var evidence = mfaEvidence(claims);
        assertMfaSession(userDetails, evidence);
        var authentication = new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
        authentication.setDetails(evidence);
        return authentication;
    }

    /** 토큰이 담은 세션차수(V2_153). 클레임이 없는 토큰(이전 발급분)은 0 이다. */
    public int getSessionCycle(String token) {
        return sessionCycle(parseClaims(token));
    }

    private static int sessionCycle(io.jsonwebtoken.Claims claims) {
        Number cycle = claims.get(CLAIM_SESSION_CYCLE, Number.class);
        return cycle == null ? 0 : cycle.intValue();
    }

    /**
     * 토큰의 세션차수가 사용자의 현재 차수와 같아야 한다(V2_153). 일반·관리자 로그아웃과 비밀번호 변경·상태 변경·잠금·권한 그룹 회수가
     * 차수를 올리면 그 전에 발급된 access·refresh token 이 모두 여기서 거부된다 — 시각 비교(로그아웃·비밀번호 변경)와 달리 같은 초의
     * 창도, 노드 시계 차이도 없다. 현재 차수를 모르는 주체(차수를 읽지 않는 어댑터)는 이 기준으로 거부하지 않는다.
     */
    public static void assertSessionCycle(UserDetails principal, int tokenCycle) {
        if (principal instanceof nuri.foundation.security.service.CustomUserDetails current
                && current.getSessionCycle() != null && current.getSessionCycle() != tokenCycle) {
            throw new org.springframework.security.authentication.CredentialsExpiredException(
                    "Token was issued before the session was revoked");
        }
    }

    public nuri.foundation.security.mfa.MfaSessionEvidence getMfaEvidence(String token) {
        return mfaEvidence(parseClaims(token));
    }

    private static nuri.foundation.security.mfa.MfaSessionEvidence mfaEvidence(io.jsonwebtoken.Claims claims) {
        Number seconds = claims.get("mfa_at", Number.class);
        return new nuri.foundation.security.mfa.MfaSessionEvidence(claims.get("mfa_v", String.class),
                seconds == null ? null : java.time.Instant.ofEpochSecond(seconds.longValue()));
    }

    /** Refresh도 이 검사를 사용하고 원래 MFA 시각을 보존한다. 비밀번호 전용 세션의 상향 인증은 금지한다. */
    public static void assertMfaSession(UserDetails principal,
            nuri.foundation.security.mfa.MfaSessionEvidence evidence) {
        if (!(principal instanceof nuri.foundation.security.service.CustomUserDetails current)) return;
        String version = evidence == null ? null : evidence.credentialVersion();
        java.time.Instant verifiedAt = evidence == null ? null : evidence.verifiedAt();
        if (!Objects.equals(current.getMfaCredentialVersion(), version)
                || (current.isMfaRequired() && (version == null || verifiedAt == null))
                || (verifiedAt != null && verifiedAt.isAfter(java.time.Instant.now().plusSeconds(30)))) {
            throw new org.springframework.security.authentication.CredentialsExpiredException("MFA session is no longer valid");
        }
    }

    /**
     * 비밀번호가 바뀌기 전에 발급된 access token 을 거부한다. [2026-09-14 DEC-OPS-094]
     *
     * <p>비밀번호 변경은 refresh token 을 폐기하지만(DEC-OPS-091), access token 은 서명 기반이라 자기 만료(기본
     * 1시간)까지 계속 통과했다 — 탈취된 토큰이 비밀번호를 바꾼 뒤에도 쓰였다. 사용자 정보는 요청마다 저장소에서
     * 다시 읽으므로 추가 조회 없이 마지막 변경 시각과 발급 시각을 비교할 수 있다.
     *
     * <p>JWT 의 발급 시각은 초 단위로 내림 저장되므로 변경 시각도 초로 내려 비교한다. 같은 초에 발급된 토큰은
     * 통과시킨다 — 변경 직후 다시 로그인한 토큰을 잘못 거부하지 않는 쪽을 택한 경계다. 변경 시각이 있는데 발급
     * 시각이 없는 토큰은 판정할 수 없으므로 거부한다.
     */
    private static void rejectIfIssuedBeforeCredentialChange(Date issuedAt, UserDetails userDetails) {
        if (userDetails instanceof nuri.foundation.security.service.CustomUserDetails details) {
            rejectIfIssuedBefore(issuedAt, details.getCredentialsChangedAt(),
                    "Access token was issued before the last credential change");
        }
    }

    /**
     * 로그아웃 전에 발급된 access token 을 거부한다. [2026-10-18]
     *
     * <p>로그아웃은 refresh token 행을 지우지만 access token 은 서명 기반이라 자기 만료(기본 1시간)까지 계속 통과했다 —
     * 로그아웃한 브라우저나 그 토큰을 가로챈 사람이 남은 시간 동안 API 를 계속 썼다. 비밀번호 변경 검사와 같은 비교를 쓴다:
     * 로그아웃 시각을 초로 내려 발급 시각(초 내림)과 비교하므로 이 시각 검사만으로는 같은 초 토큰을 구별하지 못한다.
     * 현재 온라인 로그아웃은 세션차수도 올리므로 이전 차수 토큰은 위의 assertSessionCycle 에서 거부한다.
     * 차수를 제공하지 않는 어댑터는 이 시각 비교의 같은 초 경계를 유지한다.
     *
     * <p>로그아웃 시각은 DB 시계(CURRENT_TIMESTAMP)가 아니라 토큰을 서명하는 애플리케이션 시계로 기록한다
     * ({@code AuthServiceImpl.logout}) — DB 와 앱의 시계 차이 때문에 로그아웃 직후 재로그인 토큰이 거부되지 않게 한다.
     * 여러 앱 노드가 있으면 노드 시계 동기화(NTP)를 전제한다. 시계가 늦은 노드가 발급한 재로그인 토큰은 그 차이만큼
     * 거부될 수 있으며(안전한 쪽 실패), 차이가 지나면 재발급으로 회복된다.
     */
    private static void rejectIfIssuedBeforeLogout(Date issuedAt, UserDetails userDetails) {
        if (userDetails instanceof nuri.foundation.security.service.CustomUserDetails details) {
            rejectIfIssuedBefore(issuedAt, details.getLastLogoutAt(), "Access token was issued before the last logout");
        }
    }

    private static void rejectIfIssuedBefore(Date issuedAt, java.time.Instant cutoff, String reason) {
        if (cutoff == null) {
            return;
        }
        java.time.Instant flooredCutoff = cutoff.truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        if (issuedAt == null || issuedAt.toInstant().isBefore(flooredCutoff)) {
            throw new org.springframework.security.authentication.CredentialsExpiredException(reason);
        }
    }

    public String getUserId(String token) {
        return Objects.requireNonNull(parseClaims(token).getSubject(), "Subject in JWT token cannot be null");
    }

    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(SecurityConstants.HEADER_AUTHORIZATION);
        if (bearerToken != null && bearerToken.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * 액세스 토큰으로서 유효한지 검증한다. [W1-06]
     *
     * <p><b>deny-list 로 판정한다</b> — {@code typ} 이 refresh 인 것만 거부하고, 부재하거나 access 면 통과.
     * allow-list(typ=="access" 를 <i>요구</i>)로 만들면 배포 이전에 발급된 무-typ 액세스 토큰이
     * 신 노드에서 전량 401 이 되어 <b>롤링 배포 중 대량 로그아웃</b>이 난다.
     * deny-list 는 같은 취약면(리프레시를 Bearer 로 사용)을 닫으면서 그 사고를 피한다.
     *
     * <p>⚠ 정직한 한계: 배포 이전에 발급된 <b>무-typ 리프레시 토큰은 최대 7일간 여전히 통용</b>된다.
     * 즉시 전량 차단이 필요하면 리프레시 토큰 테이블을 비워야 하고 그것은 전원 재로그인을 뜻한다.
     * 이 한계를 '해결됨' 으로 보고하지 말 것.
     */
    public boolean validateToken(String token) {
        try {
            var claims = parseClaims(token);
            if (TYPE_REFRESH.equals(claims.get(CLAIM_TOKEN_TYPE, String.class))) {
                log.warn(">>> [JWT] 리프레시 토큰이 액세스 토큰 자리에 제시되었습니다 — 거부합니다.");
                return false;
            }
            return true;
        // [W1-13] 로그 레벨 규율.
        //   이 세 예외는 전부 **공격자가 제어할 수 있는 입력**으로 발생시킬 수 있다. ERROR 로 두면
        //   ① 정상 동작이 오류로 계상돼 알람이 무뎌지고 ② 임의 요청으로 ERROR 로그를 무한 생성하는
        //   로그 볼륨 공격면이 된다. 등급을 사실에 맞춘다.
        } catch (io.jsonwebtoken.security.SignatureException e) {
            // 서명 불일치 = 변조 또는 키 로테이션 직후. 조사 가치가 있으나 서버 결함은 아니다.
            log.warn(">>> [JWT] Invalid signature: {}", e.getMessage());
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // 만료는 **정상적인 수명 종료**다. 모든 사용자가 매 세션마다 최소 한 번 겪는다.
            log.debug(">>> [JWT] Expired token: {}", e.getMessage());
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.warn(">>> [JWT] Malformed token: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn(">>> [JWT] Rejected token: {}", e.getMessage());
        } catch (Exception e) {
            // 분류되지 않은 실패만 ERROR 로 남긴다 — 여기 쌓이면 실제로 확인할 가치가 있다.
            log.error(">>> [JWT] Validation failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
        }
        return false;
    }

    /**
     * 리프레시 토큰으로서 유효한지 검증한다. [W1-06]
     *
     * <p>반대 방향도 막는다 — 액세스 토큰({@code typ=access})을 재발급 자리에 제시하면 거부한다.
     * {@code typ} 부재는 허용한다(배포 이전 발급분 호환).
     */
    public boolean validateRefreshToken(String token) {
        try {
            var claims = parseClaims(token);
            if (TYPE_ACCESS.equals(claims.get(CLAIM_TOKEN_TYPE, String.class))) {
                log.warn(">>> [JWT] 액세스 토큰이 재발급 자리에 제시되었습니다 — 거부합니다.");
                return false;
            }
            return true;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.debug(">>> [JWT] Expired refresh token: {}", e.getMessage());
        } catch (Exception e) {
            log.warn(">>> [JWT] Refresh token validation failed: {} - {}",
                    e.getClass().getSimpleName(), e.getMessage());
        }
        return false;
    }

    /** 토큰의 만료 시각. 회전 시 절대 만료를 물려주기 위해 쓴다. */
    public Date getExpiration(String token) {
        return parseClaims(token).getExpiration();
    }

    public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        // 회전은 최초 절대 만료를 물려받는다. 쿠키도 남은 시간만 보관해야 수명이 다시 늘어나지 않는다.
        long remainingSeconds = Math.max(0, (getExpiration(refreshToken).getTime() - System.currentTimeMillis()) / 1000);
        org.springframework.http.ResponseCookie responseCookie = nuri.foundation.security.util.CookieUtil.createRefreshTokenCookie(
                refreshToken,
                cookieSecure,
                remainingSeconds
        );
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> "refreshToken".equals(cookie.getName()))
                .map(cookie -> cookie.getValue())
                .findFirst()
                .orElse(null);
    }

    public void removeRefreshTokenCookie(HttpServletResponse response) {
        org.springframework.http.ResponseCookie responseCookie = nuri.foundation.security.util.CookieUtil.deleteRefreshTokenCookie(cookieSecure);
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public SecretKey getKeyForTest() {
        return this.key;
    }

    public ECPublicKey getActiveVerifyKeyForTest() {
        return this.ecVerifyKeys.get(this.activeSigningKid);
    }

    public String getActiveKidForTest() {
        return this.activeSigningKid;
    }

    public Map<String, String> getVerifyKeyFingerprints() {
        return this.ecPublicKeyFingerprints;
    }
}
