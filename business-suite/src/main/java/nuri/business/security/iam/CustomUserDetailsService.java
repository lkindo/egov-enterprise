package nuri.business.security.iam;

import nuri.business.security.service.CustomUserDetails;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.auth.UserAuthorityRepository;
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

                // 요청마다 수행되는 권한 재도출을 로그인 시점(EgovAuthenticationProvider)과 동일하게 맞춘다.
                // 과거에는 권한테이블(NEMPLYRSCRTYESTBS)만 보고 없으면 무조건 ROLE_USER 로 떨어뜨려,
                // 권한행이 없는 role 컬럼 기반 관리자(및 webmaster 특례)가 매 요청 ROLE_USER 로 강등돼
                // /api/v1/admin/** 등에서 403 을 맞았다. 로그인 응답의 role 과 요청 authz 가 불일치했다.
                String authorFromTable = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                                .map(auth -> auth.getAuthrtId())
                                .orElse(null);
                String authorCode;
                if ("webmaster".equals(user.getUserId())) {
                        authorCode = "ROLE_ADMIN";
                } else if (authorFromTable != null) {
                        authorCode = authorFromTable;
                } else {
                        authorCode = user.getRole() != null ? user.getRole().name() : "ROLE_USER";
                }
                if (!authorCode.startsWith("ROLE_")) {
                        authorCode = "ROLE_" + authorCode;
                }

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
