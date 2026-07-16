package nuri.foundation.security.service;

import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
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
    private final String roleName;
    private final String lockAt;
    private final String authorCode;

    /**
     * DB 기반 다중 권한 목록. null 이면 기존 단일 authorCode/roleName 폴백.
     * Builder 에서 {@code .authorityCodes(List.of("ROLE_ADMIN", "ROLE_SYSTEM"))} 형태로 주입한다.
     */
    @Builder.Default
    private final List<String> authorityCodes = null;

    @SuppressWarnings("unused") // Lombok @Builder가 생성하는 생성자와 정합
    private CustomUserDetails(String userId, String esntlId, String userNm, String password,
                              String roleName, String lockAt, String authorCode,
                              List<String> authorityCodes) {
        this.userId = userId;
        this.esntlId = esntlId;
        this.userNm = userNm;
        this.password = password;
        this.roleName = roleName;
        this.lockAt = lockAt;
        this.authorCode = authorCode;
        this.authorityCodes = authorityCodes;
    }

    /** 하위 호환성을 위한 7개 인자 생성자 (기존 테스트 및 호출부 지원) */
    public CustomUserDetails(String userId, String esntlId, String userNm, String password,
                             String roleName, String lockAt, String authorCode) {
        this(userId, esntlId, userNm, password, roleName, lockAt, authorCode, null);
    }

    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 다중 권한이 주입되어 있으면 우선 사용
        if (authorityCodes != null && !authorityCodes.isEmpty()) {
            return authorityCodes.stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toUnmodifiableList());
        }
        // 폴백: 기존 단일 authorCode/roleName 로직
        String role = (authorCode != null) ? authorCode
                : (roleName != null ? "ROLE_" + roleName : "ROLE_USER");
        return Collections.singleton(new SimpleGrantedAuthority(role));
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
        return true;
    }
}
