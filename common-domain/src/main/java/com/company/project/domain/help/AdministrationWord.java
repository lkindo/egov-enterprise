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
@Table(name = "NADMINISTRATIONWORD")
public class AdministrationWord {

    @Id
    @Column(name = "ADMINIST_WORD_ID", length = 20)
    private String administWordId;

    @Column(name = "ADMINIST_WORD_NM", length = 255)
    private String administWordNm;

    @Column(name = "ADMINIST_WORD_ENG_NM", length = 255)
    private String administWordEngNm;

    @Column(name = "ADMINIST_WORD_ABRV_NM", length = 255)
    private String administWordAbrv;

    @Column(name = "THEMA_RELM", length = 255)
    private String themaRelm;

    @Column(name = "WORD_SE", length = 255)
    private String wordDomn;

    @Column(name = "RELATE_STD_WORD", length = 255)
    private String stdWord;

    @Column(name = "ADMINIST_WORD_DFN", columnDefinition = "TEXT")
    private String administWordDf;

    @Column(name = "ADMINIST_WORD_DC", columnDefinition = "TEXT")
    private String administWordDc;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public AdministrationWord(String administWordId, String administWordNm, String administWordEngNm,
            String administWordAbrv,
            String themaRelm, String wordDomn, String stdWord, String administWordDf, String administWordDc,
            String frstRegisterId) {
        this.administWordId = administWordId;
        this.administWordNm = administWordNm;
        this.administWordEngNm = administWordEngNm;
        this.administWordAbrv = administWordAbrv;
        this.themaRelm = themaRelm;
        this.wordDomn = wordDomn;
        this.stdWord = stdWord;
        this.administWordDf = administWordDf;
        this.administWordDc = administWordDc;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String administWordNm, String administWordEngNm, String administWordAbrv,
            String themaRelm, String wordDomn, String stdWord, String administWordDf, String administWordDc,
            String lastUpdusrId) {
        this.administWordNm = administWordNm;
        this.administWordEngNm = administWordEngNm;
        this.administWordAbrv = administWordAbrv;
        this.themaRelm = themaRelm;
        this.wordDomn = wordDomn;
        this.stdWord = stdWord;
        this.administWordDf = administWordDf;
        this.administWordDc = administWordDc;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
