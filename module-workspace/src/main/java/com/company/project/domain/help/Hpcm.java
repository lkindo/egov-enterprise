package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 도움말 정보 Entity
 * 테이블명: NHPCMINFO
 */
@Entity
@Table(name = "NHPCMINFO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
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

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc, String userId) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}
