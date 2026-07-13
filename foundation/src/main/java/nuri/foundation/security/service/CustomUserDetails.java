package nuri.foundation.security.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.Collections;
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
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final String userId;
    private final String esntlId;
    private final String userNm;
    private final String password;
    private final String roleName;
    private final String lockAt;
    private final String authorCode;

    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
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
