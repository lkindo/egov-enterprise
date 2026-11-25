package nuri.foundation.core.util;

import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.egovframe.rte.fdl.crypto.EgovPasswordEncoder;
import org.egovframe.rte.fdl.crypto.impl.EgovARIACryptoServiceImpl;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.core.env.Profiles;
import org.jspecify.annotations.NonNull;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
public class CryptoUtil implements ApplicationContextAware {

    private static volatile EgovCryptoService cryptoService;
    private static volatile String algorithmKey;
    private static volatile EgovCryptoService previousCryptoService;
    private static volatile String previousAlgorithmKey;

    /** eGovFrame 공개 샘플키 등 약한 기본값 — 운영에서 사용 시 경고 대상(재암호화 동반 로테이션 필요). */
    private static final java.util.Set<String> WEAK_DEFAULT_KEYS = java.util.Set.of("egovframe", "egoventerprise0123");

    @org.springframework.beans.factory.annotation.Value("${Globals.File.algorithmKey:egovframe}")
    public void setAlgorithmKey(String key) {
        // [보안 H1] 마스터 키 원문을 로그로 남기지 않는다(로드 여부만 기록).
        log.info("### CryptoUtil: algorithmKey injected (loaded={})", key != null && !key.isBlank());
        // [보안 C1] 소스에 커밋된 약한 기본키를 운영에서 그대로 쓰면 PII 복호화 위험 → 큰 경고.
        if (key != null && WEAK_DEFAULT_KEYS.contains(key)) {
            log.warn("### [SECURITY] 약한 기본 암호화 키가 사용 중입니다. 외부 시크릿(ALGORITHM_KEY 등)으로 "
                    + "고엔트로피 키를 주입하고, 키 로테이션 시 기존 암호문 재암호화 마이그레이션을 수행하십시오.");
        }
        CryptoUtil.algorithmKey = key;
    }

    /**
     * 키 회전 중 기존 암호문을 읽기 위한 단일 이전 키.
     * 빈 값이면 폴백을 완전히 끄며, 키 원문은 어떤 로그에도 남기지 않는다.
     */
    @org.springframework.beans.factory.annotation.Value("${Globals.File.previousAlgorithmKey:}")
    public void setPreviousAlgorithmKey(String key) {
        boolean loaded = key != null && !key.isBlank();
        log.info("### CryptoUtil: previousAlgorithmKey injected (loaded={})", loaded);
        if (!loaded) {
            previousAlgorithmKey = null;
            previousCryptoService = null;
            return;
        }
        previousAlgorithmKey = key;
        previousCryptoService = createAriaService(key);
    }

    @Override
    public void setApplicationContext(@NonNull ApplicationContext applicationContext) {
        log.info("### CryptoUtil: setApplicationContext called");
        var env = applicationContext.getEnvironment();
        if (env != null && env.acceptsProfiles(Profiles.of("prod"))
                && (algorithmKey == null || algorithmKey.isBlank() || algorithmKey.contains("${")
                        || WEAK_DEFAULT_KEYS.contains(algorithmKey))) {
            throw new IllegalStateException(
                    "prod 프로파일에서는 약한 기본 암호화 키, 빈 키 또는 미해결 플레이스홀더를 사용할 수 없습니다. 외부 시크릿(ALGORITHM_KEY)을 주입하십시오.");
        }
        CryptoUtil.cryptoService = (EgovCryptoService) applicationContext.getBean("ariacryptoService");
    }

    /**
     * Encrypt Data using ARIA algorithm
     */
    public static String encrypt(String data) {
        try {
            if (data == null)
                return null;
            if (cryptoService == null || algorithmKey == null) {
                log.error("### CryptoUtil Error: cryptoService is {} and algorithmKey is {}",
                        (cryptoService == null ? "NULL" : "SET"), (algorithmKey == null ? "NULL" : "SET"));
                throw new RuntimeException("CryptoUtil not initialized properly");
            }
            byte[] encrypted = cryptoService.encrypt(data.getBytes(StandardCharsets.UTF_8), algorithmKey);
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypt Data using ARIA algorithm
     */
    public static String decrypt(String encryptedData) {
        try {
            if (encryptedData == null)
                return null;
            // [정합성] encrypt()와 동일하게 초기화 상태를 명시적으로 검증(늦은 정적 주입으로 인한 불명확 NPE 방지).
            if (cryptoService == null || algorithmKey == null) {
                throw new RuntimeException("CryptoUtil not initialized properly");
            }
            byte[] decoded = Base64.getDecoder().decode(encryptedData);
            try {
                byte[] decrypted = cryptoService.decrypt(decoded, algorithmKey);
                return new String(decrypted, StandardCharsets.UTF_8);
            } catch (Exception activeKeyFailure) {
                if (previousCryptoService == null || previousAlgorithmKey == null) {
                    throw activeKeyFailure;
                }
                try {
                    byte[] decrypted = previousCryptoService.decrypt(decoded, previousAlgorithmKey);
                    return new String(decrypted, StandardCharsets.UTF_8);
                } catch (Exception previousKeyFailure) {
                    activeKeyFailure.addSuppressed(previousKeyFailure);
                    throw activeKeyFailure;
                }
            }
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    /**
     * 현재 키와(있으면) 이전 키로 각각 풀어 본 결과를 순서대로 돌려준다 — 예외가 난 키의 결과는 빠진다.
     *
     * <p>[왜 따로 두는가 — 2026-11-25 Codex 검토] {@link #decrypt} 는 현재 키에서 예외가 날 때만 이전 키를 쓴다. 그런데 ARIA 는
     * 다른 키로 풀어도 예외 없이 엉뚱한 바이트를 돌려줄 수 있어, 키 교체 중에는 이전 키로 만든 값을 현재 키로 '성공적으로'
     * 잘못 읽을 수 있다. 다시 쓰는 일괄 작업은 두 결과를 모두 받아 형식으로 판정하고, 하나로 정하지 못하면 쓰지 않는다.
     * 원문·키는 로그에 남기지 않는다.
     */
    public static java.util.List<String> decryptCandidates(String encryptedData) {
        if (encryptedData == null || cryptoService == null || algorithmKey == null) {
            return java.util.List.of();
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(encryptedData);
        } catch (IllegalArgumentException notBase64) {
            return java.util.List.of();
        }
        java.util.List<String> candidates = new java.util.ArrayList<>(2);
        try {
            candidates.add(new String(cryptoService.decrypt(decoded, algorithmKey), StandardCharsets.UTF_8));
        } catch (Exception activeKeyFailure) {
            // 현재 키로 풀리지 않는다 — 이전 키 결과만 남긴다.
        }
        EgovCryptoService previous = previousCryptoService;
        String previousKey = previousAlgorithmKey;
        if (previous != null && previousKey != null) {
            try {
                candidates.add(new String(previous.decrypt(decoded, previousKey), StandardCharsets.UTF_8));
            } catch (Exception previousKeyFailure) {
                // 이전 키로도 풀리지 않는다.
            }
        }
        return java.util.List.copyOf(candidates);
    }

    /** 활성 빈과 분리된 이전 키 전용 ARIA 인스턴스를 만든다. */
    private static EgovCryptoService createAriaService(String key) {
        EgovPasswordEncoder encoder = new EgovPasswordEncoder();
        encoder.setAlgorithm("SHA-256");
        encoder.setHashedPassword(encoder.encryptPassword(key));

        EgovARIACryptoServiceImpl service = new EgovARIACryptoServiceImpl();
        service.setBlockSize(1024);
        service.setPasswordEncoder(encoder);
        return service;
    }
}
