package com.company.project.domain.auth;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "NAUTHORROLERELATE")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@AttributeOverride(name = "createdDate", column = @Column(name = "CREAT_DT", updatable = false))
@SuperBuilder
public class AuthorityRole extends BaseEntity {

    @EmbeddedId
    private AuthorityRoleId id;

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
