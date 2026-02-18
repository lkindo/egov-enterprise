package com.company.project.core.util;

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

    @org.springframework.beans.factory.annotation.Value("${Globals.File.algorithmKey:egovframe}")
    public void setAlgorithmKey(String key) {
        log.info("### CryptoUtil: algorithmKey injected: {}", key);
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
            byte[] decoded = Base64.getDecoder().decode(encryptedData);
            byte[] decrypted = cryptoService.decrypt(decoded, algorithmKey);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
