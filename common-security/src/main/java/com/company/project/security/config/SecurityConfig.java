package com.company.project.security.config;

import com.company.project.security.jwt.JwtAuthenticationFilter;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.security.service.CustomUserDetailsService;
import com.company.project.security.service.EgovPasswordEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableWebSecurity
@org.springframework.context.annotation.Profile("!test")
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(@org.springframework.context.annotation.Lazy JwtTokenProvider jwtTokenProvider,
            Environment environment) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Bean
    @SuppressWarnings("deprecation")
    public PasswordEncoder passwordEncoder() {
        String encodingId = "bcrypt";
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put("bcrypt", new BCryptPasswordEncoder());
        encoders.put("egov", NoOpPasswordEncoder.getInstance());

        return new DelegatingPasswordEncoder(encodingId, encoders);
    }

    @Bean
    public EgovPasswordEncoder egovPasswordEncoder() {
        return new EgovPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            CustomUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder,
            EgovPasswordEncoder egovPasswordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider() {
            @Override
            protected void additionalAuthenticationChecks(UserDetails userDetails,
                    UsernamePasswordAuthenticationToken authentication)
                    throws AuthenticationException {

                String presentationPassword = authentication.getCredentials().toString();
                String encodedPassword = userDetails.getPassword();

                // If password starts with {egov} or has no prefix (legacy candidate)
                if (encodedPassword != null
                        && (encodedPassword.startsWith("{egov}") || !encodedPassword.startsWith("{"))) {
                    String cleanHash = encodedPassword.startsWith("{egov}") ? encodedPassword.substring(6)
                            : encodedPassword;
                    String salt = ((CustomUserDetails) userDetails).getUser().getUserId();

                    boolean match = egovPasswordEncoder.matches(presentationPassword, cleanHash, salt);

                    if (match) {
                        return; // Success
                    }
                }

                // Fallback to BCrypt or others
                super.additionalAuthenticationChecks(userDetails, authentication);
            }
        };
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(DaoAuthenticationProvider authenticationProvider) {
        return new ProviderManager(authenticationProvider);
    }

    @Bean
    @org.springframework.core.annotation.Order(1)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/resource/**", "/static/**").permitAll()
                        .requestMatchers("/uat/uia/**", "/auth/**").permitAll()
                        .requestMatchers("/sym/mms/**").permitAll()
                        .requestMatchers("/connection").permitAll()
                        .requestMatchers("/WEB-INF/**", "/upload/**").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        // Enhanced Header Security
        http.headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.sameOrigin())
                .contentTypeOptions(Customizer.withDefaults())
                .xssProtection(xss -> xss.headerValue(
                        org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                .httpStrictTransportSecurity(hsts -> hsts
                        .maxAgeInSeconds(31536000L)
                        .includeSubDomains(true)
                        .preload(true))
                .cacheControl(Customizer.withDefaults())
                .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));

        // Add security headers for additional protection
        http.headers(headers -> headers
                .defaultsDisabled()
                .cacheControl(Customizer.withDefaults())
                .contentTypeOptions(Customizer.withDefaults())
                .httpStrictTransportSecurity(Customizer.withDefaults())
                .frameOptions(Customizer.withDefaults())
                .xssProtection(Customizer.withDefaults())
                .referrerPolicy(Customizer.withDefaults()));

        return http.build();
    }
}
