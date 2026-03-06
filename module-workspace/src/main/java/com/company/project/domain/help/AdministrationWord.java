package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * ??깆젟??밸선 ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NADMINISTRATIONWORD
 */
@Entity
@Table(name = "NADMINISTRATIONWORD")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AdministrationWord extends BaseEntity {

    @Id
    @Column(name = "ADMINIST_WORD_ID", length = 20)
    private String administWordId;

    @Column(name = "ADMINIST_WORD_NM", length = 255, nullable = false)
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
                      String themaRelm, String wordDomn, String stdWord, String administWordDf, String administWordDc, String userId) {
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
