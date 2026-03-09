package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 행정 용어 Repository
 */
@Entity
@Table(name = "NADMINISTWORD")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdministrationWord extends BaseEntity {

    @Id
    @Column(name = "ADMINIST_WORD_ID", length = 20)
    private String administWordId;

    @Column(name = "ADMINIST_WORD_NM", length = 100, nullable = false)
    private String administWordNm;

    @Column(name = "ADMINIST_WORD_ENG_NM", length = 100)
    private String administWordEngNm;

    @Column(name = "ADMINIST_WORD_ABRV", length = 100)
    private String administWordAbrv;

    @Column(name = "THEMA_RELM", length = 50)
    private String themaRelm;

    @Column(name = "WORD_DOMN", length = 50)
    private String wordDomn;

    @Column(name = "STD_WORD", length = 100)
    private String stdWord;

    @Column(name = "ADMINIST_WORD_DFN", length = 2000)
    private String administWordDf;

    @Column(name = "ADMINIST_WORD_DC", columnDefinition = "TEXT")
    private String administWordDc;

    @Builder
    public AdministrationWord(String administWordId, String administWordNm, String administWordEngNm,
                              String administWordAbrv, String themaRelm, String wordDomn, String stdWord,
                              String administWordDf, String administWordDc, String frstRegisterId) {
        this.administWordId = administWordId;
        this.administWordNm = administWordNm;
        this.administWordEngNm = administWordEngNm;
        this.administWordAbrv = administWordAbrv;
        this.themaRelm = themaRelm;
        this.wordDomn = wordDomn;
        this.stdWord = stdWord;
        this.administWordDf = administWordDf;
        this.administWordDc = administWordDc;
        this.createdBy = frstRegisterId;
    }

    public void update(String administWordNm, String administWordEngNm, String administWordAbrv,
                       String themaRelm, String wordDomn, String stdWord, String administWordDf,
                       String administWordDc, String userId) {
        this.administWordNm = administWordNm;
        this.administWordEngNm = administWordEngNm;
        this.administWordAbrv = administWordAbrv;
        this.themaRelm = themaRelm;
        this.wordDomn = wordDomn;
        this.stdWord = stdWord;
        this.administWordDf = administWordDf;
        this.administWordDc = administWordDc;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}
