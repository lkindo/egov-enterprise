package com.company.project.domain.menu;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "NBKMKMENUMANAGERESULT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BkmkMenu {

    @EmbeddedId
    private BkmkMenuId id;

    @Column(name = "MENU_NM", length = 60)
    private String menuNm;

    @Column(name = "PROGRM_STRE_PATH", length = 100)
    private String progrmStrePath;

    @Builder
    public BkmkMenu(BkmkMenuId id, String menuNm, String progrmStrePath) {
        this.id = id;
        this.menuNm = menuNm;
        this.progrmStrePath = progrmStrePath;
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class BkmkMenuId implements Serializable {
        @Column(name = "MENU_ID")
        private Long menuId;

        @Column(name = "EMPLYR_ID", length = 20)
        private String userId;
    }
}
