package nuri.business.domain.help;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 온라인 메뉴얼 Entity
 * 매핑 테이블: TB_ONLN_MNL_INFO
 */
@Entity
@Table(name = "tb_onln_mnl_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class OnlineManual extends BaseEntity {

    @Id
    @Column(length = 20)
    private String onlnMnlId;

    @Column(length = 100, nullable = false)
    private String onlnMnlNm;

    @Column(length = 12, nullable = false)
    private String onlnMnlSeCd;

    @Column(length = 1000)
    private String onlnMnlDfn;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String onlnMnlExpln;

    // 전체 own 필드 위임 생성자 (팩토리 전용, 시그니처 충돌 방지 위해 private)
    private OnlineManual(String onlnMnlId, String onlnMnlNm, String onlnMnlSeCd, String onlnMnlDfn, String onlnMnlExpln) {
        this.onlnMnlId = onlnMnlId;
        this.onlnMnlNm = onlnMnlNm;
        this.onlnMnlSeCd = onlnMnlSeCd;
        this.onlnMnlDfn = onlnMnlDfn;
        this.onlnMnlExpln = onlnMnlExpln;
    }

    @Builder
    public static OnlineManual create(String onlnMnlId, String onlnMnlNm, String onlnMnlSeCd, String onlnMnlDfn, String onlnMnlExpln) {
        return new OnlineManual(onlnMnlId, onlnMnlNm, onlnMnlSeCd, onlnMnlDfn, onlnMnlExpln);
    }

    public void update(String onlnMnlNm, String onlnMnlSeCd, String onlnMnlDfn, String onlnMnlExpln) {
        this.onlnMnlNm = onlnMnlNm;
        this.onlnMnlSeCd = onlnMnlSeCd;
        this.onlnMnlDfn = onlnMnlDfn;
        this.onlnMnlExpln = onlnMnlExpln;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
