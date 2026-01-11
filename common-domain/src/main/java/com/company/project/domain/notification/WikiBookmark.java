package com.company.project.domain.notification;

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
@Table(name = "NWIKIBKMK")
public class WikiBookmark {

    @Id
    @Column(name = "WIKI_BKMK_ID", length = 20)
    private String wikiBkmkId;

    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "WIKI_BKMK_NM", length = 255)
    private String wikiBkmkNm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public WikiBookmark(String wikiBkmkId, String userId, String wikiBkmkNm, String frstRegisterId) {
        this.wikiBkmkId = wikiBkmkId;
        this.userId = userId;
        this.wikiBkmkNm = wikiBkmkNm;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
