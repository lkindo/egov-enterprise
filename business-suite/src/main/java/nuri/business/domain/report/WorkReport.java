package nuri.business.domain.report;

import nuri.foundation.domain.common.BaseEntity;
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
    private String reportId;

    @Column(name = "rpt_ttl", length = 100, nullable = false)
    private String reportSubject;

    @Column(name = "rpt_cn", columnDefinition = "TEXT")
    private String reportContents;

    @Transient
    private String atchFileId;

    @Column(name = "rpt_se_cd", length = 12)
    private String reprtSe;

    @Column(name = "user_id", length = 20)
    private String wrterId;

    public void update(String reportSubject, String reportContents, String atchFileId, String reprtSe) {
        this.reportSubject = reportSubject;
        this.reportContents = reportContents;
        this.atchFileId = atchFileId;
        this.reprtSe = reprtSe;
    }

    // standard aliases
    public String getReprtId() { return reportId; }
    public String getReprtTtl() { return reportSubject; }
    public String getReprtCn() { return reportContents; }
}
