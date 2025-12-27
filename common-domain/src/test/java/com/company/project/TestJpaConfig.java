package com.company.project;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * common-domain 모듈 테스트용 설정 클래스
 * 
 * @DataJpaTest에서 @SpringBootConfiguration을 찾지 못하는 문제 해결
 */
@SpringBootApplication
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
public class TestJpaConfig {
}
