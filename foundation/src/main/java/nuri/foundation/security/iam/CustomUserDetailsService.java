package nuri.foundation.security.iam;

import nuri.foundation.security.service.CustomUserDetails;

import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
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
                User user = userRepository.findByUserId(Objects.requireNonNull(username))
                                .or(() -> userRepository.findByEsntlId(Objects.requireNonNull(username)))
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "User not found: " + username));

                String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                                .map(UserAuthority::getAuthrtId)
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
