package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * ??밸선?????類ｋ궖 Entity
 * ??뉕탢?????뵠?? NWORDDICARYINFO
 */
@Entity
@Table(name = "NWORDDICARYINFO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    public WordDicary(String wordId, String wordNm, String engNm, String wordDc, String synonm, String frstRegisterId) {
        this.wordId = wordId;
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
        this.createdBy = frstRegisterId;
    }

    public void update(String wordNm, String engNm, String wordDc, String synonm, String userId) {
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}