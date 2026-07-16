package nuri.business.security.iam;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.foundation.security.iam.UserAuthPort;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

/**
 * UserAuthPort의 JPA 어댑터 구현체.
 *
 * <p>사용자 인증 정보를 로딩하면서, 다중 권한(DB 기반)도 함께 조립한다.
 * <ul>
 *   <li><b>기존 동작(폴백)</b>: {@code tb_user_authrt_map}에서 단일 {@code authrt_id}를 조회하여
 *       {@code authorCode}로 설정 → {@code CustomUserDetails.getAuthorities()}가 단일 권한 반환</li>
 *   <li><b>확장(Expand)</b>: {@code tb_authrt_role_map}을 통해 사용자의 권한에 매핑된
 *       추가 롤을 조회하여 {@code authorityCodes}로 주입 → 다중 권한 반환</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class JpaUserAuthAdapter implements UserAuthPort {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final JdbcTemplate jdbcTemplate;

    /** tb_authrt_role_map 을 통해 권한코드에 매핑된 모든 롤을 조회한다. */
    private static final String LOAD_MAPPED_ROLES_SQL = """
            SELECT DISTINCT arm.role_cd
            FROM tb_user_authrt_map uam
            JOIN tb_authrt_role_map arm ON uam.authrt_id = arm.authrt_cd
            WHERE uam.scrty_dcsn_trgt_id = ?
            """;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUserId(Objects.requireNonNull(username))
                .or(() -> userRepository.findByEsntlId(Objects.requireNonNull(username)))
                .orElse(null);

        if (user == null) {
            return null;
        }

        // 기존 단일 권한 로직 (폴백용으로 유지)
        String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                .map(auth -> auth.getAuthrtId())
                .map(code -> code.startsWith("ROLE_") ? code : "ROLE_" + code)
                .orElse("ROLE_USER");

        // 확장: DB(authrt_role_map) 기반 다중 권한 로딩
        List<String> authorityCodes = loadMappedRoles(user.getEsntlId(), authorCode);

        return CustomUserDetails.builder()
                .userId(user.getUserId())
                .esntlId(user.getEsntlId())
                .userNm(user.getUserNm())
                .password(user.getPswd())
                .roleName(user.getRole() != null ? user.getRole().name() : null)
                .lockAt(user.getLckYn())
                .authorCode(authorCode)
                .authorityCodes(authorityCodes)
                .build();
    }

    /**
     * 사용자의 esntlId 로 tb_authrt_role_map 에서 매핑된 롤을 조회한다.
     * 매핑이 없으면 기존 단일 authorCode 만 포함한 리스트를 반환한다(폴백).
     */
    private List<String> loadMappedRoles(String esntlId, String fallbackAuthorCode) {
        try {
            List<String> roles = jdbcTemplate.queryForList(LOAD_MAPPED_ROLES_SQL, String.class, esntlId);
            if (roles != null && !roles.isEmpty()) {
                // DB 매핑된 롤 + 기존 권한코드를 합침 (중복 제거)
                java.util.LinkedHashSet<String> combined = new java.util.LinkedHashSet<>();
                combined.add(fallbackAuthorCode);
                for (String role : roles) {
                    combined.add(role.startsWith("ROLE_") ? role : "ROLE_" + role);
                }
                return List.copyOf(combined);
            }
        } catch (Exception e) {
            // DB 조회 실패 시 폴백: 기존 단일 권한
        }
        return null; // null이면 CustomUserDetails가 기존 단일 로직 사용
    }
}

