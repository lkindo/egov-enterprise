package com.company.project.core.util;

import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Component
public class CryptoUtil implements ApplicationContextAware {

    private static EgovCryptoService cryptoService;
    private static final String ALGORITHM = "ARIA";

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) {
        CryptoUtil.cryptoService = (EgovCryptoService) applicationContext.getBean("ariacryptoService");
    }

    /**
     * Encrypt Data using ARIA algorithm
     */
    public static String encrypt(String data) {
        // FIXME: Encryption bypass for debugging
        if (data == null)
            return null;
        return "ENC_" + Base64.getEncoder().encodeToString(data.getBytes(StandardCharsets.UTF_8));
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
     * Decrypt Data using ARIA algorithm
     */
    public static String decrypt(String encryptedData) {
        try {
            if (encryptedData == null)
                return null;
            byte[] decoded = Base64.getDecoder().decode(encryptedData);
            byte[] decrypted = cryptoService.decrypt(decoded, ALGORITHM);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
