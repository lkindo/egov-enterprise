package com.company.project.domain.informalsanction;

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
 * 비정형 결재 Entity
 */
@Entity
@Table(name = "NINFRMLSANCTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanction extends BaseEntity {

    @Id
    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String informalSanctionId;

    @Column(name = "JOB_SE_CODE", length = 3, nullable = false)
    private String jobSeCode;

    @Column(name = "APPLCNT_ID", length = 20, nullable = false)
    private String applicantId;

    @Column(name = "REQST_DE", length = 10)
    private String requestDe;

    @Column(name = "SANCTNER_ID", length = 20, nullable = false)
    private String sanctionerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctionDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Builder
    public InformalSanction(String informalSanctionId, String jobSeCode, String applicantId, String requestDe,
            String sanctionerId, String confmAt, LocalDateTime sanctionDt, String returnResn) {
        this.informalSanctionId = informalSanctionId;
        this.jobSeCode = jobSeCode;
        this.applicantId = applicantId;
        this.requestDe = requestDe;
        this.sanctionerId = sanctionerId;
        this.confmAt = confmAt != null ? confmAt : "N";
        this.sanctionDt = sanctionDt;
        this.returnResn = returnResn;
    }

    public void update(String jobSeCode, String requestDe, String sanctionerId) {
        this.jobSeCode = jobSeCode;
        this.requestDe = requestDe;
        this.sanctionerId = sanctionerId;
    }

    public void confirm(String confmAt, String returnResn) {
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctionDt = LocalDateTime.now();
    }
}