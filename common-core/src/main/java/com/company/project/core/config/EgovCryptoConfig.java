package com.company.project.core.config;

import org.egovframe.rte.fdl.crypto.EgovPasswordEncoder;
import org.egovframe.rte.fdl.crypto.impl.EgovARIACryptoServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EgovCryptoConfig {

    @Bean(name = "ariacryptoService")
    public EgovARIACryptoServiceImpl cryptoService() {
        EgovARIACryptoServiceImpl cryptoService = new EgovARIACryptoServiceImpl();
        cryptoService.setBlockSize(1024);
        cryptoService.setPasswordEncoder(new EgovPasswordEncoder()); // Using default encoder
        return cryptoService;
    }
}
