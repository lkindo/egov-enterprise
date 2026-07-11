package nuri.business.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_menu_crt_dtl")
public class MenuAuthority extends BaseEntity {

    @EmbeddedId
    private MenuAuthorityId id;

    @Column(length = 20)
    private String mapngCrtId;

    private MenuAuthority(MenuAuthorityId id, String mapngCrtId) {
        this.id = id;
        this.mapngCrtId = mapngCrtId;
    }

    @Builder
    public static MenuAuthority create(MenuAuthorityId id, String mapngCrtId) {
        return new MenuAuthority(id, mapngCrtId);
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class MenuAuthorityId implements Serializable {
        @Column(length = 12)
        private String authrtCd;

                private Long menuSn;
    }
}
