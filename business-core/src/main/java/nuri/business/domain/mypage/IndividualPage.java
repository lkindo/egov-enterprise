package nuri.business.domain.mypage;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 마이페이지 설정 엔티티
 * 매핑 테이블: NINDVDLPGE
 */
@Entity
@Table(name = "tb_indv_pg")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IndividualPage extends BaseEntity {

    @Id
    @Column(length = 20)
    private String pageId;

    @Column(length = 300, nullable = false)
    private String pageTtl;

    @Column(length = 4000)
    private String pageExpln;

    @Column(length = 20, nullable = false)
    private String userId;

    private IndividualPage(String pageId, String pageTtl, String pageExpln, String userId) {
        this.pageId = pageId;
        this.pageTtl = pageTtl;
        this.pageExpln = pageExpln;
        this.userId = userId;
    }

    @Builder
    public static IndividualPage create(String pageId, String pageTtl, String pageExpln, String userId) {
        return new IndividualPage(pageId, pageTtl, pageExpln, userId);
    }

    public void update(String pageTtl, String pageExpln) {
        this.pageTtl = pageTtl;
        this.pageExpln = pageExpln;
    }
}
