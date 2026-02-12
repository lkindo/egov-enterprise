package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 용어사전 정보 Entity
 * 레거시 테이블: NWORDDICARYINFO
 */
@Entity
@Table(name = "NWORDDICARYINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WordDicary extends BaseEntity {

    @Id
    @Column(name = "WORD_ID", length = 20)
    private String wordId;

    @Column(name = "WORD_NM", length = 255, nullable = false)
    private String wordNm;

    @Column(name = "ENG_NM", length = 60)
    private String engNm;

    @Column(name = "WORD_DC", columnDefinition = "TEXT")
    private String wordDc;

    @Column(name = "SYNONM", length = 100)
    private String synonm;

    @Builder
    public WordDicary(String wordId, String wordNm, String engNm, String wordDc, String synonm) {
        this.wordId = wordId;
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
    }

    public void update(String wordNm, String engNm, String wordDc, String synonm) {
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
    }
}
