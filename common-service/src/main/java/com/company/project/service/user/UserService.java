package com.company.project.service.user;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService extends EgovAbstractServiceImpl {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        // eGovFrame Logging Utility
        egovLogger.info("Signing up user: {}", request.userId());

        if (userRepository.findById(request.userId()).isPresent()) {
            throw new IllegalArgumentException("User already exists");
        }

        User user = User.builder()
                .userId(request.userId())
                .password(passwordEncoder.encode(request.password()))
                .userNm(request.userNm())
                .esntlId("USR_" + java.util.UUID.randomUUID().toString().substring(0, 16))
                .passwordHint(request.passwordHint())
                .passwordCnsr(request.passwordCnsr())
                .role(request.role())
                .build();

        return UserResponse.from(userRepository.save(user));
    }
}
