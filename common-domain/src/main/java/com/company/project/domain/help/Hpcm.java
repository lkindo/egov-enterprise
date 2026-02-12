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
 * 도움말 정보 Entity
 * 레거시 테이블: NHPCMINFO
 */
@Entity
@Table(name = "NHPCMINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Hpcm extends BaseEntity {

    @Id
    @Column(name = "HPCM_ID", length = 20)
    private String hpcmId;

    @Column(name = "HPCM_SE_CODE", length = 3, nullable = false)
    private String hpcmSeCode;

    @Column(name = "HPCM_DFN", length = 1000, nullable = false)
    private String hpcmDf;

    @Column(name = "HPCM_DC", columnDefinition = "TEXT")
    private String hpcmDc;

    @Builder
    public Hpcm(String hpcmId, String hpcmSeCode, String hpcmDf, String hpcmDc) {
        this.hpcmId = hpcmId;
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
    }

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
    }
}
