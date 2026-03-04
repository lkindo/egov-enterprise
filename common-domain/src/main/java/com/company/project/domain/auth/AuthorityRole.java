package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NAUTHORROLERELATE")
public class AuthorityRole {

    @EmbeddedId
    private AuthorityRoleId id;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Builder
    public AuthorityRole(AuthorityRoleId id) {
        this.id = id;
        this.creatDt = LocalDateTime.now();
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class AuthorityRoleId implements Serializable {
        @Column(name = "AUTHOR_CODE", length = 30)
        private String authorCode;

        @Column(name = "ROLE_CODE", length = 50)
        private String roleCode;
    }
}