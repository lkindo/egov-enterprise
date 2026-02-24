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

// @Service - Deactivated to favor EgovAuthenticationProvider explicitly
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
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)));

        String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                .map(UserAuthority::getAuthorCode)
                .orElse(null);

        return new CustomUserDetails(user, authorCode);
    }
}
