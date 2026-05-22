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
    private String rptId;

    @Column(name = "rpt_ttl", length = 100, nullable = false)
    private String rptTtl;

    @Column(name = "rpt_cn", columnDefinition = "TEXT", length = 4000)
    private String rptCn;

    @Transient
    private String atchFileId;

    @Column(name = "rpt_se_cd", length = 12)
    private String rptSeCd;

    @Column(name = "user_id", length = 20)
    private String userId;

    @Column(name = "rpt_stts_cd", length = 12)
    private String rptSttsCd;

    @Column(name = "rpt_ymd", length = 8)
    private String rptYmd;

    public void update(String rptTtl, String rptCn, String atchFileId, String rptSeCd) {
        this.rptTtl = rptTtl;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
        this.rptSeCd = rptSeCd;
    }

    // standard aliases
    public String getReprtId() { return rptId; }
    public String getReprtTtl() { return rptTtl; }
    public String getReprtCn() { return rptCn; }

    // legacy aliases for frontend compatibility
    public String getReprtSttusCode() { return rptSttsCd; }
    public void setReprtSttusCode(String v) { this.rptSttsCd = v; }
    public String getReprtDe() { return rptYmd; }
    public void setReprtDe(String v) { this.rptYmd = v; }

    // ----- [Legacy Aliases for Backward Compatibility] -----

    @Deprecated
    public String getReportId() {
        return rptId;
    }

    @Deprecated
    public void setReportId(String reportId) {
        this.rptId = reportId;
    }

    @Deprecated
    public String getReportSubject() {
        return rptTtl;
    }

    @Deprecated
    public void setReportSubject(String reportSubject) {
        this.rptTtl = reportSubject;
    }

    @Deprecated
    public String getReportContents() {
        return rptCn;
    }

    @Deprecated
    public void setReportContents(String reportContents) {
        this.rptCn = reportContents;
    }

    @Deprecated
    public String getReprtSe() {
        return rptSeCd;
    }

    @Deprecated
    public void setReprtSe(String reprtSe) {
        this.rptSeCd = reprtSe;
    }

    @Deprecated
    public String getWrterId() {
        return userId;
    }

    @Deprecated
    public void setWrterId(String wrterId) {
        this.userId = wrterId;
    }

    public static abstract class WorkReportBuilder<C extends WorkReport, B extends WorkReportBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String rptId;
        private String rptTtl;
        private String rptCn;
        private String rptSeCd;
        private String userId;
        private String rptSttsCd;
        private String rptYmd;

        @Deprecated
        public B reportId(String reportId) {
            this.rptId = reportId;
            return self();
        }

        @Deprecated
        public B reportSubject(String reportSubject) {
            this.rptTtl = reportSubject;
            return self();
        }

        @Deprecated
        public B reportContents(String reportContents) {
            this.rptCn = reportContents;
            return self();
        }

        @Deprecated
        public B reprtSe(String reprtSe) {
            this.rptSeCd = reprtSe;
            return self();
        }

        @Deprecated
        public B wrterId(String wrterId) {
            this.userId = wrterId;
            return self();
        }

        public B reprtSttusCode(String reprtSttusCode) {
            this.rptSttsCd = reprtSttusCode;
            return self();
        }

        public B reprtDe(String reprtDe) {
            this.rptYmd = reprtDe;
            return self();
        }
    }
}
