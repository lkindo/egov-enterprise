package nuri.business.domain.report;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "TB_RPT_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class WorkReport extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reportId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reportSubject;

    @Column(name = "REPRT_CN", columnDefinition = "TEXT")
    private String reportContents;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "REPRT_SE_CD", length = 3)
    private String reprtSe;

    @Column(name = "WRTER_ID", length = 20)
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
