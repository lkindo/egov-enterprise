package nuri.business.security.iam;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.foundation.security.iam.UserAuthPort;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * UserAuthPort의 JPA 어댑터 구현체
 */
@Component
@RequiredArgsConstructor
public class JpaUserAuthAdapter implements UserAuthPort {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUserId(Objects.requireNonNull(username))
                .or(() -> userRepository.findByEsntlId(Objects.requireNonNull(username)))
                .orElse(null);

        if (user == null) {
            return null;
        }

        String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                .map(auth -> auth.getAuthrtId())
                .map(code -> code.startsWith("ROLE_") ? code : "ROLE_" + code)
                .orElse("ROLE_USER");

        return CustomUserDetails.builder()
                .userId(user.getUserId())
                .esntlId(user.getEsntlId())
                .userNm(user.getUserNm())
                .password(user.getPswd())
                .roleName(user.getRole() != null ? user.getRole().name() : null)
                .lockAt(user.getLckYn())
                .authorCode(authorCode)
                .build();
    }
}
