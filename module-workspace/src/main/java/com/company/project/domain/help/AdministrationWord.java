package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 행정전문용어 사전 Entity
 * 매핑 테이블: NADMINISTWORDDICARY
 */
@Entity
@Table(name = "NADMINISTWORDDICARY")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class AdministrationWord extends BaseEntity {

    @Id
    @Column(name = "ADMINIST_WORD_ID", length = 20)
    private String administWordId;

    @Column(name = "ADMINIST_WORD_NM", length = 255, nullable = false)
    private String administWordNm;

    @Column(name = "ADMINIST_WORD_ENG_NM", length = 255)
    private String administWordEngNm;

    @Column(name = "ADMINIST_WORD_ABRV", length = 255)
    private String administWordAbrv;

    @Column(name = "THEMA_RELM", length = 255)
    private String themaRelm;

    @Column(name = "WORD_DOMN", length = 255)
    private String wordDomn;

    @Column(name = "STD_WORD", length = 255)
    private String stdWord;

    @Column(name = "ADMINIST_WORD_DFN", length = 1000)
    private String administWordDf;

    @Column(name = "ADMINIST_WORD_DC", columnDefinition = "TEXT")
    private String administWordDc;

    public void update(String administWordNm, String administWordEngNm, String administWordAbrv,
                       String themaRelm, String wordDomn, String stdWord, String administWordDf, String administWordDc) {
        this.administWordNm = administWordNm;
        this.administWordEngNm = administWordEngNm;
        this.administWordAbrv = administWordAbrv;
        this.themaRelm = themaRelm;
        this.wordDomn = wordDomn;
        this.stdWord = stdWord;
        this.administWordDf = administWordDf;
        this.administWordDc = administWordDc;
    }
}
