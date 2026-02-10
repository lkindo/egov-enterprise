package com.company.project.domain.program;

import java.io.Serializable;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "HPROGRMCHANGEDTLS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProgramChangeRequest {

    @EmbeddedId
    private ProgramChangeRequestId id;

    @Column(name = "RQESTER_ID", length = 20)
    private String rqesterId;

    @Column(name = "CHANGE_REQUST_CN", length = 1000)
    private String changeRequstCn;

    @Column(name = "REQUST_PROCESS_CN", length = 1000)
    private String requstProcessCn;

    @Column(name = "OPETR_ID", length = 20)
    private String opetrId;

    @Column(name = "PROCESS_STTUS_CODE", length = 1)
    private String processStatusCode;

    @Column(name = "PROCESS_DE")
    private LocalDate processDe;

    @Column(name = "RQESTDE")
    private LocalDate rqestDe;

    @Column(name = "REQUST_SJ", length = 60)
    private String requstSj;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class ProgramChangeRequestId implements Serializable {
        @Column(name = "PROGRM_FILE_NM", length = 60)
        private String progrmFileNm;

        @Column(name = "REQUST_NO")
        private Long requstNo;

        @Builder
        public ProgramChangeRequestId(String progrmFileNm, Long requstNo) {
            this.progrmFileNm = progrmFileNm;
            this.requstNo = requstNo;
        }
    }

    @Builder
    public ProgramChangeRequest(ProgramChangeRequestId id, String rqesterId, String changeRequstCn,
            String requstProcessCn, String opetrId, String processStatusCode,
            LocalDate processDe, LocalDate rqestDe, String requstSj) {
        this.id = id;
        this.rqesterId = rqesterId;
        this.changeRequstCn = changeRequstCn;
        this.requstProcessCn = requstProcessCn;
        this.opetrId = opetrId;
        this.processStatusCode = processStatusCode;
        this.processDe = processDe;
        this.rqestDe = rqestDe;
        this.requstSj = requstSj;
    }

    public void update(String rqesterId, String changeRequstCn, LocalDate rqestDe, String requstSj) {
        this.rqesterId = rqesterId;
        this.changeRequstCn = changeRequstCn;
        this.rqestDe = rqestDe;
        this.requstSj = requstSj;
    }

    public void process(String requstProcessCn, String opetrId, String processStatusCode, LocalDate processDe) {
        this.requstProcessCn = requstProcessCn;
        this.opetrId = opetrId;
        this.processStatusCode = processStatusCode;
        this.processDe = processDe;
    }
}
