package nuri.business.domain.auth;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_menu_crt_dtl")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class MenuAuthority extends BaseEntity {

    @EmbeddedId
    private MenuAuthorityId id;

    @Column(length = 20)
    private String mapngCrtId;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class MenuAuthorityId implements Serializable {
        @Column(name = "authrt_cd", length = 12)
        private String authrtCd;

        @Column(name = "menu_sn")
        private Long menuSn;
    }
}
