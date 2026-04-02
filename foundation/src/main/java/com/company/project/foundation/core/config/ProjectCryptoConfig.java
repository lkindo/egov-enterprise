package com.company.project.foundation.core.config;

import org.egovframe.rte.fdl.crypto.EgovPasswordEncoder;
import org.egovframe.rte.fdl.crypto.impl.EgovARIACryptoServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@PropertySource(value = "classpath:egovframework/egovProps/globals.properties", ignoreResourceNotFound = true)
public class ProjectCryptoConfig {

    @Value("${Globals.File.algorithmKey:egovframe}")
    private String algorithmKey;

    @Bean(name = "ariacryptoService")
    public EgovARIACryptoServiceImpl cryptoService() {
        // EgovPasswordEncoder ??쇱젟
        EgovPasswordEncoder encoder = new EgovPasswordEncoder();
        encoder.setAlgorithm("SHA-256");

        // algorithmKey????곷뻻??뤿연 verification??뱀몵嚥쇱젟
        String hashedPassword = encoder.encryptPassword(algorithmKey);
        encoder.setHashedPassword(hashedPassword);

        // EgovARIACryptoServiceImpl ??쇱젟
        EgovARIACryptoServiceImpl cryptoService = new EgovARIACryptoServiceImpl();
        cryptoService.setBlockSize(1024);
        cryptoService.setPasswordEncoder(encoder);

        return cryptoService;
    }

    @Bean
    public com.company.project.foundation.core.util.CryptoUtil cryptoUtil() {
        return new com.company.project.foundation.core.util.CryptoUtil();
    }
}
