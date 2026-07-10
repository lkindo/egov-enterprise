package nuri.foundation.core.util;

import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Component
public class CryptoUtil implements ApplicationContextAware {

    private static EgovCryptoService cryptoService;
    private static String algorithmKey;

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

    @Override
    public void setApplicationContext(@NonNull ApplicationContext applicationContext) {
        log.info("### CryptoUtil: setApplicationContext called");
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
     * Encrypt Session interaction (Legacy support for egovc:encryptSession)
     */
    public static String encryptSession(String data, String sessionId) {
        if (data == null)
            return "-";
        String target = sessionId + "|" + data;
        return encrypt(target);
    }

    /**
     * Encrypt ID (Legacy support for egovc:encryptId)
     */
    public static String encryptId(String data) {
        return encrypt(data);
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
            byte[] decrypted = cryptoService.decrypt(decoded, algorithmKey);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
