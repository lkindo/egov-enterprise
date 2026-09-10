package nuri.foundation.security.service;

import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * 인증 주체(principal). <b>두 개의 식별자</b>를 보유하므로 호출부에서 혼동하지 않도록 유의한다.
 * <ul>
 *   <li>{@code userId}   — 사용자가 로그인 시 입력하는 <b>로그인 ID</b> ({@link #getLoginId()} / {@code getUserId()})</li>
 *   <li>{@code esntlId}  — 시스템 내부 고유 식별자, User 엔티티의 PK ({@link #getEsntlId()})</li>
 * </ul>
 * Spring Security 계약상 {@link #getUsername()} 은 <b>esntlId</b> 를 반환한다(로그인 ID 아님).
 */
@Getter
@Builder
public class CustomUserDetails implements UserDetails {

    private final String userId;
    private final String esntlId;
    private final String userNm;
    private final String password;
    /** 표시 호환 전용. 인가에는 사용하지 않는다. */
    private final String roleName;
    private final String lockAt;
    /** 표시 호환 전용. 인가에는 사용하지 않는다. */
    private final String authorCode;

    /** 이전 builder 호출의 소스 호환만 유지한다. 이 값으로 권한을 부여하지 않는다. */
    @Builder.Default
    private final List<String> authorityCodes = null;

    @Builder.Default
    private final List<String> groups = List.of();
    @Builder.Default
    private final List<String> permissions = List.of();
    private final String authorizationVersion;
    /** 계정 저장소가 현재 상태를 확인해 명시적으로 활성화해야 한다. */
    private final boolean enabled;

    private CustomUserDetails(String userId, String esntlId, String userNm, String password,
                              String roleName, String lockAt, String authorCode,
                              List<String> authorityCodes, List<String> groups, List<String> permissions,
                              String authorizationVersion, boolean enabled) {
        this.userId = userId;
        this.esntlId = esntlId;
        this.userNm = userNm;
        this.password = password;
        this.roleName = roleName;
        this.lockAt = lockAt;
        this.authorCode = authorCode;
        this.authorityCodes = authorityCodes;
        this.groups = immutableCodes(groups);
        this.permissions = immutableCodes(permissions);
        this.authorizationVersion = authorizationVersion;
        this.enabled = enabled;
    }

    /** 하위 호환성을 위한 7개 인자 생성자 (기존 테스트 및 호출부 지원) */
    public CustomUserDetails(String userId, String esntlId, String userNm, String password,
                             String roleName, String lockAt, String authorCode) {
        this(userId, esntlId, userNm, password, roleName, lockAt, authorCode,
                null, List.of(), List.of(), null, false);
    }

    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 그룹 이름과 이전 role 표현을 capability로 승격하지 않는다. 빈 권한은 빈 권한이다.
        return permissions.stream().map(SimpleGrantedAuthority::new).toList();
    }

    private static List<String> immutableCodes(List<String> codes) {
        if (codes == null) {
            return List.of();
        }
        if (codes.stream().anyMatch(code -> code == null || code.isBlank())) {
            throw new IllegalArgumentException("Authorization codes must be non-blank");
        }
        return codes.stream().map(Objects::requireNonNull).distinct().sorted().toList();
    }

    @JsonIgnore
    @Override
    public String getPassword() {
        return password;
    }

    /** 로그인 ID 를 명시적으로 반환한다({@code userId} 필드와 동일). 호출부 가독성을 위한 별칭. */
    @JsonIgnore
    public String getLoginId() {
        return userId;
    }

    /**
     * Spring Security 계약 메서드. <b>주의: 로그인 ID 가 아니라 esntlId 를 반환한다.</b>
     * 로그인 ID 가 필요하면 {@link #getLoginId()}, 고유 ID 가 필요하면 {@link #getEsntlId()} 를 쓴다.
     */
    @JsonIgnore
    @Override
    public String getUsername() {
        return esntlId;
    }

    @JsonIgnore
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @JsonIgnore
    @Override
    public boolean isAccountNonLocked() {
        return !"Y".equalsIgnoreCase(lockAt);
    }

    @JsonIgnore
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @JsonIgnore
    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
