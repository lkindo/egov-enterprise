package nuri.foundation.domain.menu;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import java.io.Serializable;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "nbkmkmenumanageresult")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class BkmkMenu extends BaseEntity {

    @EmbeddedId
    private BkmkMenuId id;

    @Column(name = "menu_nm", length = 60)
    private String menuNm;

    @Column(name = "progrm_stre_path", length = 100)
    private String progrmStrePath;

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
        @Column(name = "menu_id")
        private Long menuId;

        @Column(name = "user_id", length = 20)
        private String userId;
    }
}
