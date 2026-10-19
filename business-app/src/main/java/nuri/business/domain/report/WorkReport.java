package nuri.business.domain.report;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "tb_rpt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkReport extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rptpSn;

    /** 낙관적 잠금 버전(V2_133). 화면이 읽은 값과 다르면 다른 사람이 먼저 고친 것이다(서비스가 409 로 거부한다). */
    @Version
    private Integer version;

    @Column(length = 100, nullable = false)
    private String rptTtl;

    @Column(length = 4000)
    private String rptCn;
    private Long atchFileSn;

    @Column(length = 12)
    private String rptSeCd;

    @Column(length = 20)
    private String userId;

    /**
     * 보고 상태 코드. [2026-10-19] 이 상태를 정하거나 바꾸는 처리 흐름이 제품에 없어 API·화면에서 걷었다.
     * 물리 컬럼(tb_rpt_info.rpt_stts_cd)은 남기므로 매핑만 읽기 전용으로 둔다 — 앱은 이 컬럼에 쓰지 않는다.
     */
    @Column(length = 12, insertable = false, updatable = false)
    private String rptSttsCd;

    @Column(length = 8)
    private String rptYmd;

    private WorkReport(Long rptpSn, String rptTtl, String rptCn, Long atchFileSn,
                       String rptSeCd, String userId, String rptYmd) {
        this.rptpSn = rptpSn;
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileSn = atchFileSn;
        this.rptSeCd = rptSeCd;
        this.userId = userId;
        this.rptYmd = rptYmd;
    }

    @Builder
    public static WorkReport create(Long rptpSn, String rptTtl, String rptCn, Long atchFileSn,
                                    String rptSeCd, String userId, String rptYmd) {
        return new WorkReport(rptpSn, rptTtl, rptCn, atchFileSn, rptSeCd, userId, rptYmd);
    }

    public void update(String rptTtl, String rptCn, Long atchFileSn, String rptSeCd, String rptYmd) {
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileSn = atchFileSn;
        this.rptSeCd = rptSeCd;
        // 기존 클라이언트가 날짜를 생략하면 보존하되, 명시한 날짜는 성공 응답과 함께 실제 반영한다.
        if (rptYmd != null) {
            this.rptYmd = rptYmd;
        }
    }


}
