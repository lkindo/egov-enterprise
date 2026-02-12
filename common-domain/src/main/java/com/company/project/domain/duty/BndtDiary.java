package com.company.project.domain.duty;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 당직 일지 정보 Entity
 * 레거시 테이블: NBNDTDIARY
 */
@Entity
@Table(name = "NBNDTDIARY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(BndtDiaryId.class)
public class BndtDiary extends BaseEntity {

    @Id
    @Column(name = "BNDT_ID", length = 20)
    private String bndtId;

    @Id
    @Column(name = "BNDT_DE", length = 8)
    private String bndtDe;

    @Id
    @Column(name = "BNDT_CECK_SE", length = 2)
    private String bndtCeckSe;

    @Id
    @Column(name = "BNDT_CECK_CODE", length = 10)
    private String bndtCeckCd;

    @Column(name = "CHCK_STTUS", length = 1)
    private String chckSttus;

    @Builder
    public BndtDiary(String bndtId, String bndtDe, String bndtCeckSe, String bndtCeckCd, String chckSttus) {
        this.bndtId = bndtId;
        this.bndtDe = bndtDe;
        this.bndtCeckSe = bndtCeckSe;
        this.bndtCeckCd = bndtCeckCd;
        this.chckSttus = chckSttus;
    }

    public void update(String chckSttus) {
        this.chckSttus = chckSttus;
    }
}
