package com.company.project.domain.sanctn;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 약식결재 정보 Entity
 * 레거시 테이블: NINFRMLSANCTN
 */
@Entity
@Table(name = "NINFRMLSANCTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctn extends BaseEntity {

    @Id
    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    @Column(name = "JOB_SE_CODE", length = 3, nullable = false)
    private String jobSeCode;

    @Column(name = "APPLCNT_ID", length = 20, nullable = false)
    private String applcntId;

    @Column(name = "REQST_DE", length = 10)
    private String reqstDe;

    @Column(name = "SANCTNER_ID", length = 20, nullable = false)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Builder
    public InformalSanctn(String infrmlSanctnId, String jobSeCode, String applcntId, String reqstDe,
                         String sanctnerId, String confmAt, LocalDateTime sanctnDt, String returnResn) {
        this.infrmlSanctnId = infrmlSanctnId;
        this.jobSeCode = jobSeCode;
        this.applcntId = applcntId;
        this.reqstDe = reqstDe;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt != null ? confmAt : "N";
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
    }

    public void update(String jobSeCode, String reqstDe, String sanctnerId) {
        this.jobSeCode = jobSeCode;
        this.reqstDe = reqstDe;
        this.sanctnerId = sanctnerId;
    }

    public void confirm(String confmAt, String returnResn) {
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
    }
}
