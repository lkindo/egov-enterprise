package com.company.project.security.service;

import com.company.project.domain.user.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Getter
public class CustomUserDetails implements UserDetails {

    private final User user;
    private final String authorCode;

    public CustomUserDetails(User user) {
        this.user = user;
        this.authorCode = null;
    }

    public CustomUserDetails(User user, String authorCode) {
        this.user = user;
        this.authorCode = authorCode;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String role = (authorCode != null) ? authorCode
                : (user.getRole() != null ? "ROLE_" + user.getRole().name() : "ROLE_USER");
        return Collections.singleton(new SimpleGrantedAuthority(role));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEsntlId();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"Y".equalsIgnoreCase(user.getLockAt());
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
