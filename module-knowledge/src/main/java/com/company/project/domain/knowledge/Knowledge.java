package com.company.project.domain.knowledge;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 지식 정보 JPA Entity
 * 테이블: NKNOWLEDGE
 */
@Entity
@Table(name = "NKNOWLEDGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Knowledge extends BaseEntity {

    @Id
    @Column(name = "KNO_ID", length = 20)
    private String knoId;

    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "KNO_TYPE_CD", length = 20)
    private String knoTypeCd;

    @Column(name = "KNO_NM", length = 255, nullable = false)
    private String knoNm;

    @Column(name = "KNO_CN", length = 4000)
    private String knoCn;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "COL_YMD", length = 20)
    private String colYmd;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    public void update(String knoTypeCd, String knoNm, String knoCn, String othbcAt,
            String atchFileId) {
        this.knoTypeCd = knoTypeCd;
        this.knoNm = knoNm;
        this.knoCn = knoCn;
        this.othbcAt = othbcAt;
        this.atchFileId = atchFileId;
    }
}
