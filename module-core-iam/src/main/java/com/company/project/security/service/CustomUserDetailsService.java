package com.company.project.security.service;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

        private final UserRepository userRepository;
        private final UserAuthorityRepository userAuthorityRepository;

        @Override
        @Transactional(readOnly = true)
        public UserDetails loadUserByUsername(String username)
                        throws UsernameNotFoundException {
                User user = userRepository.findById(Objects.requireNonNull(username))
                                .orElseGet(() -> userRepository.findByEsntlId(Objects.requireNonNull(username))
                                                .orElseThrow(() -> new UsernameNotFoundException(
                                                                "User not found: " + username)));

                String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                                .map(UserAuthority::getAuthorCode)
                                .map(code -> code.startsWith("ROLE_") ? code : "ROLE_" + code)
                                .orElse("ROLE_USER");

                return CustomUserDetails.builder()
                                .userId(user.getUserId())
                                .esntlId(user.getEsntlId())
                                .userNm(user.getUserNm())
                                .password(user.getPassword())
                                .roleName(user.getRole() != null ? user.getRole().name() : null)
                                .lockAt(user.getLockAt())
                                .authorCode(authorCode)
                                .build();
        }
}
