package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NMENUCREATDTLS")
public class MenuAuthority {

    @EmbeddedId
    private MenuAuthorityId id;

    @Column(name = "MAPNG_CREAT_ID", length = 30)
    private String mapngCreatId;

    @Builder
    public MenuAuthority(MenuAuthorityId id, String mapngCreatId) {
        this.id = id;
        this.mapngCreatId = mapngCreatId;
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class MenuAuthorityId implements Serializable {
        @Column(name = "AUTHOR_CODE", length = 30)
        private String authorCode;

        @Column(name = "MENU_NO")
        private Long menuNo;
    }
}