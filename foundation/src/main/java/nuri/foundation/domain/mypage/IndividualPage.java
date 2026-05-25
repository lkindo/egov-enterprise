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
@Table(name = "tb_indv_pg")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class IndividualPage extends BaseEntity {

    @Id
    @Column(name = "page_id", length = 20)
    private String pageId;

    @Column(length = 300, nullable = false)
    private String pageTtl;

    @Column(length = 4000)
    private String pageExpln;

    @Column(length = 30, nullable = false)
    private String userId;

    public void update(String pageTtl, String pageExpln) {
        this.pageTtl = pageTtl;
        this.pageExpln = pageExpln;
    }
}
