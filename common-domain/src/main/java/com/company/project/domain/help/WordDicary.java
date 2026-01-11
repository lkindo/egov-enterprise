package com.company.project.domain.help;

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
@Table(name = "NWORDDICARYINFO")
public class WordDicary {

    @Id
    @Column(name = "WORD_ID", length = 20)
    private String wordId;

    @Column(name = "WORD_NM", length = 255)
    private String wordNm;

    @Column(name = "ENG_NM", length = 60)
    private String engNm;

    @Column(name = "WORD_DC", columnDefinition = "TEXT")
    private String wordDc;

    @Column(name = "SYNONM", length = 100)
    private String synonm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public WordDicary(String wordId, String wordNm, String engNm, String wordDc, String synonm, String frstRegisterId) {
        this.wordId = wordId;
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String wordNm, String engNm, String wordDc, String synonm, String lastUpdusrId) {
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
