package nuri.business.domain.report;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "tb_rpt_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class WorkReport extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "rpt_id", length = 20)
    private String rptId;

    @Column(length = 100, nullable = false)
    private String rptTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String rptCn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(length = 12)
    private String rptSeCd;

    @Column(length = 20)
    private String userId;

    @Column(length = 12)
    private String rptSttsCd;

    @Column(length = 8)
    private String rptYmd;

    public void update(String rptTtl, String rptCn, String atchFileId, String rptSeCd) {
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
        this.rptSeCd = rptSeCd;
    }


}
