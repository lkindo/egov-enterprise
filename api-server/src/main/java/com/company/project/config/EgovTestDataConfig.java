package com.company.project.config;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 테스트용 데이터 초기화 설정
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class EgovTestDataConfig {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    @Transactional
    public void initTestData() {
        createTestUser("webmaster", "관리자", "ROLE_ADMIN", "USRCNFRM_00000000001");
        createTestUser("user_regular", "일반사용자", "ROLE_USER", "USRCNFRM_00000000002");
    }

    private void createTestUser(String userId, String userNm, String role, String esntlId) {
        if (userRepository.findById(userId).isEmpty()) {
            log.info(">>> Creating test user: {} (Role: {})", userId, role);
            
            User user = User.builder()
                    .userId(userId)
                    .password(passwordEncoder.encode("1"))
                    .userNm(userNm)
                    .esntlId(esntlId)
                    .userSe("USR")
                    .userSttus("P")
                    .sbscrbDe(LocalDateTime.now())
                    .build();
            
            userRepository.save(user);
            
            UserAuthority authority = UserAuthority.builder()
                    .esntlId(esntlId)
                    .authorCode(role)
                    .build();
            
            userAuthorityRepository.save(authority);
            log.info(">>> Test user created successfully: {}", userId);
        }
    }
}
