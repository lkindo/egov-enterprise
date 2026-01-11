package com.company.project.domain.survey;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NONLINEPOLLMANAGE")
public class OnlinePollManage {

    @Id
    @Column(name = "POLL_ID", length = 20)
    private String pollId;

    @Column(name = "POLL_NM", length = 255)
    private String pollNm;

    @Column(name = "POLL_BGNDE", length = 10)
    private String pollBeginDe;

    @Column(name = "POLL_ENDDE", length = 10)
    private String pollEndDe;

    @Column(name = "POLL_KND", length = 20)
    private String pollKindCode;

    @Column(name = "POLL_DSUSE_ENNC", length = 1)
    private String pollDsuseYn;

    @Column(name = "POLL_ATMC_DSUSE_ENNC", length = 1)
    private String pollAutoDsuseYn;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public OnlinePollManage(String pollId, String pollNm, String pollBeginDe, String pollEndDe, String pollKindCode,
            String pollDsuseYn, String pollAutoDsuseYn, String frstRegisterId) {
        this.pollId = pollId;
        this.pollNm = pollNm;
        this.pollBeginDe = pollBeginDe;
        this.pollEndDe = pollEndDe;
        this.pollKindCode = pollKindCode;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAutoDsuseYn = pollAutoDsuseYn;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String pollNm, String pollBeginDe, String pollEndDe, String pollKindCode, String pollDsuseYn,
            String pollAutoDsuseYn, String lastUpdusrId) {
        this.pollNm = pollNm;
        this.pollBeginDe = pollBeginDe;
        this.pollEndDe = pollEndDe;
        this.pollKindCode = pollKindCode;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAutoDsuseYn = pollAutoDsuseYn;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
