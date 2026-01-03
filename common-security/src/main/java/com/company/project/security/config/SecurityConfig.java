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
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableWebSecurity
@org.springframework.context.annotation.Profile("!test")
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity(prePostEnabled = false)
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(@org.springframework.context.annotation.Lazy JwtTokenProvider jwtTokenProvider,
            Environment environment) {
        System.out.println(">>> SecurityConfig LOADED! <<<");
        this.jwtTokenProvider = jwtTokenProvider;
        // this.environment = environment; // Not actually stored in field in original
        // code I saw?
        // Wait, line 40 was: "private final JwtTokenProvider jwtTokenProvider;"
        // Line 41: "public SecurityConfig(..."
        // I should stick to original signature if possible or add Environment if
        // needed.
        // Original code Step 1803 shows NO 'environment' field.
        // Step 1592 AuthenticInterceptor HAD 'environment' field.
        // SecurityConfig Step 1803: NO environment field.
        // So I should NOT verify environment. just print.
    }

    @Bean
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

                    System.out.println(">>> AuthCheck: User=" + userDetails.getUsername() + ", Salt=" + salt);
                    System.out.println(">>> AuthCheck: Encoded=" + cleanHash);
                    System.out.println(">>> AuthCheck: Input=" + presentationPassword);

                    boolean match = egovPasswordEncoder.matches(presentationPassword, cleanHash, salt);
                    System.out.println(">>> AuthCheck: Match Result = " + match);

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
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    @org.springframework.core.annotation.Order(1)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(
                        securityContext -> securityContext.securityContextRepository(securityContextRepository()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/resource/**").permitAll()
                        .requestMatchers("/uat/uia/**").permitAll()
                        .requestMatchers("/sym/mms/**").permitAll()
                        .requestMatchers("/connection").permitAll()
                        .requestMatchers("/WEB-INF/**").permitAll() // Allow internal forwarding to JSPs
                        .anyRequest().authenticated())
                .formLogin(login -> login
                        .loginPage("/uat/uia/egovLoginUsr.do") // Redirect to custom login page
                        .permitAll())
                .addFilterBefore((request, response, chain) -> {
                    jakarta.servlet.http.HttpServletRequest req = (jakarta.servlet.http.HttpServletRequest) request;
                    jakarta.servlet.http.HttpServletResponse res = (jakarta.servlet.http.HttpServletResponse) response;
                    System.out.println(">>> DEBUG_FILTER_PRE: " + req.getRequestURI());
                    chain.doFilter(request, response);
                    System.out.println(
                            ">>> DEBUG_FILTER_POST: " + req.getRequestURI() + " => Status: " + res.getStatus());
                }, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        // H2 콘솔 사용을 위한 설정
        http.headers(headers -> headers.frameOptions(
                org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig::sameOrigin));

        return http.build();
    }
}
