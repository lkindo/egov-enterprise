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
@Table(name = "NONLINEPOLLRESULT")
public class OnlinePollResult {

    @Id
    @Column(name = "POLL_RESULT_ID", length = 20)
    private String pollResultId;

    @Column(name = "POLL_ID", length = 20)
    private String pollId;

    @Column(name = "POLL_IEM_ID", length = 20)
    private String pollIemId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public OnlinePollResult(String pollResultId, String pollId, String pollIemId, String frstRegisterId) {
        this.pollResultId = pollResultId;
        this.pollId = pollId;
        this.pollIemId = pollIemId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
