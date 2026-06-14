package nuri.business.domain.menu;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import java.io.Serializable;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_bkmk_menu_mng_rslt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class BkmkMenu extends BaseEntity {

    @EmbeddedId
    private BkmkMenuId id;

    @Column(length = 60)
    private String menuNm;

    @Column(length = 100)
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
                private Long menuId;

        @Column(length = 20)
        private String userId;
    }
}
