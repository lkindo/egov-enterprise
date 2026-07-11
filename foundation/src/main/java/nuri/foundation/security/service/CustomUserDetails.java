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
