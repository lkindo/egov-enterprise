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

    @Column(length = 100, nullable = false)
    private String rptTtl;

    @Column(length = 4000)
    private String rptCn;

    @Column(length = 20)
    private String atchFileId;

    @Column(length = 12)
    private String rptSeCd;

    @Column(length = 20)
    private String userId;

    @Column(length = 12)
    private String rptSttsCd;

    @Column(length = 8)
    private String rptYmd;

    private WorkReport(Long rptpSn, String rptTtl, String rptCn, String atchFileId,
                       String rptSeCd, String userId, String rptSttsCd, String rptYmd) {
        this.rptpSn = rptpSn;
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
        this.rptSeCd = rptSeCd;
        this.userId = userId;
        this.rptSttsCd = rptSttsCd;
        this.rptYmd = rptYmd;
    }

    @Builder
    public static WorkReport create(Long rptpSn, String rptTtl, String rptCn, String atchFileId,
                                    String rptSeCd, String userId, String rptSttsCd, String rptYmd) {
        return new WorkReport(rptpSn, rptTtl, rptCn, atchFileId, rptSeCd, userId, rptSttsCd, rptYmd);
    }

    public void update(String rptTtl, String rptCn, String atchFileId, String rptSeCd) {
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
        this.rptSeCd = rptSeCd;
    }


}
