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
        try {
            if (data == null)
                return null;
            byte[] encrypted = cryptoService.encrypt(data.getBytes(StandardCharsets.UTF_8), ALGORITHM);
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
            byte[] decoded = Base64.getDecoder().decode(encryptedData);
            byte[] decrypted = cryptoService.decrypt(decoded, ALGORITHM);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
