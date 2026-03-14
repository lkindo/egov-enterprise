package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 용어 사전 Entity
 * 매핑 테이블: NWORDDICARYINFO
 */
@Entity
@Table(name = "NWORDDICARYINFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class WordDicary extends BaseEntity {

    @Id
    @Column(name = "WORD_ID", length = 20)
    private String wordId;

    @Column(name = "WORD_NM", length = 255, nullable = false)
    private String wordNm;

    @Column(name = "ENG_NM", length = 255)
    private String engNm;

    @Column(name = "WORD_DC", columnDefinition = "TEXT")
    private String wordDc;

    @Column(name = "SYNONM", length = 255)
    private String synonm;

    public void update(String wordNm, String engNm, String wordDc, String synonm) {
        this.wordNm = wordNm;
        this.engNm = engNm;
        this.wordDc = wordDc;
        this.synonm = synonm;
    }
}
