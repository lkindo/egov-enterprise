package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "TB_MENU_CREAT_DTLS")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class MenuAuthority extends BaseEntity {

    @EmbeddedId
    private MenuAuthorityId id;

    @Column(name = "MAPNG_CREAT_ID", length = 30)
    private String mapngCreatId;

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
