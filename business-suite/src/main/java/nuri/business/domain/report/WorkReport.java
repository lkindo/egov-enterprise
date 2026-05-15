package nuri.business.domain.report;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_RPT_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class WorkReport extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String rptId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String rptTtl;

    @Column(name = "REPRT_CN", length = 4000)
    private String rptCn;

    @Column(name = "REPRT_SE", length = 1)
    private String rptTypeCd; // 1: 주간, 2: 월간

    @Column(name = "REPRT_DE", length = 20)
    private String rptYmd;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPRT_STTUS", length = 1)
    private String rptSttsCd; // 1: 작업중, 2: 보고완료

    public void update(String rptTtl, String rptCn, String rptTypeCd, String rptYmd,
            String rptSttsCd) {
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.rptTypeCd = rptTypeCd;
        this.rptYmd = rptYmd;
        this.rptSttsCd = rptSttsCd;
    }
}
