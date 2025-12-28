package com.company.project.security.service;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findById(username)
                .orElseGet(() -> userRepository.findByEsntlId(username)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)));

        String authorCode = userAuthorityRepository.findById(user.getEsntlId())
                .map(UserAuthority::getAuthorCode)
                .orElse(null);

        return new CustomUserDetails(user, authorCode);
    }
}
