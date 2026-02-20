package com.company.project;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * common-domain 筌뤴뫀諭????뮞?紐꾩뒠 ??쇱젟 ?????
 * 
 * @DataJpaTest?癒?퐣 @SpringBootConfiguration??筌≪뼚? 筌륁궢釉???얜챷????욧퍙
 */
@SpringBootApplication
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
public class TestJpaConfig {
}
