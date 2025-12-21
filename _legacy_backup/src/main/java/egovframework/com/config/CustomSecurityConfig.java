package egovframework.com.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.firewall.StrictHttpFirewall;

/**
 * Spring Security 6 Java Configuration
 * 
 * eGovFrame 5.0에서 XML 기반 security:http 설정이 MvcRequestMatcher 오류를 발생시키므로
 * Java Config 방식으로 전환하여 springSecurityFilterChain 빈을 생성합니다.
 * 
 * @since 2025.12.18
 */
@Configuration
@EnableWebSecurity
public class CustomSecurityConfig {

    /**
     * Security Filter Chain 설정
     * 모든 요청을 허용하며, 인증은 EgovLoginController에서 수동으로 처리합니다.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 비활성화 (eGovFrame 호환)
                .csrf(csrf -> csrf.disable())
                // 모든 요청 허용 (인증은 컨트롤러 레벨에서 처리)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll())
                // 폼 로그인 비활성화 (eGovFrame 자체 로그인 사용)
                .formLogin(form -> form.disable())
                // HTTP Basic 비활성화
                .httpBasic(basic -> basic.disable());

        return http.build();
    }

    /**
     * Strict HTTP Firewall 설정
     * URL에 세미콜론 허용 (eGovFrame 호환)
     */
    @Bean
    public HttpFirewall httpFirewall() {
        StrictHttpFirewall firewall = new StrictHttpFirewall();
        firewall.setAllowSemicolon(true);
        return firewall;
    }
}
