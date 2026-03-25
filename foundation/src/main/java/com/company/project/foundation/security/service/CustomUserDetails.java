package com.company.project.foundation.security.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.Collections;

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

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String role = (authorCode != null) ? authorCode
                : (roleName != null ? "ROLE_" + roleName : "ROLE_USER");
        return Collections.singleton(new SimpleGrantedAuthority(role));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return esntlId;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"Y".equalsIgnoreCase(lockAt);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
