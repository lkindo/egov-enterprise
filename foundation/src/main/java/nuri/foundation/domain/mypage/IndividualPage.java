package nuri.foundation.domain.mypage;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 마이페이지 설정 엔티티
 * 매핑 테이블: NINDVDLPGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_INDV_PG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class IndividualPage extends BaseEntity {

    @Id
    @Column(name = "PAGE_ID", length = 20)
    private String pageId;

    @Column(name = "PAGE_TTL", length = 300, nullable = false)
    private String pageTtl;

    @Column(name = "PAGE_EXPLN", length = 4000)
    private String pageExpln;

    @Column(name = "USER_ID", length = 30, nullable = false)
    private String userId;

    public void update(String pageTtl, String pageExpln) {
        this.pageTtl = pageTtl;
        this.pageExpln = pageExpln;
    }
}
