package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * 도움말 정보 Entity
 * 레거시 테이블: NHPCMINFO
 */
@Entity
@Table(name = "NHPCMINFO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    public Hpcm(String hpcmId, String hpcmSeCode, String hpcmDf, String hpcmDc, String frstRegisterId) {
        this.hpcmId = hpcmId;
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
        this.createdBy = frstRegisterId;
    }

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc, String userId) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}
