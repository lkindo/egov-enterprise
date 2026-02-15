package com.company.project.domain.duty;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * 당직 체크 관리 정보 Entity
 * 레거시 테이블: NBNDTCECKMANAGE
 */
@Entity
@Table(name = "NBNDTCECKMANAGE")
@IdClass(BndtCeckManageId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BndtCeckManage extends BaseEntity {

    @Id
    @Column(name = "BNDT_CECK_SE", length = 2)
    private String bndtCeckSe;

    @Id
    @Column(name = "BNDT_CECK_CODE", length = 10)
    private String bndtCeckCd;

    @Column(name = "BNDT_CECK_CODE_NM", length = 255, nullable = false)
    private String bndtCeckCdNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Builder
    public BndtCeckManage(String bndtCeckSe, String bndtCeckCd, String bndtCeckCdNm, String useAt,
            String frstRegisterId) {
        this.bndtCeckSe = bndtCeckSe;
        this.bndtCeckCd = bndtCeckCd;
        this.bndtCeckCdNm = bndtCeckCdNm;
        this.useAt = useAt;
        this.createdBy = frstRegisterId;
    }

    public void update(String bndtCeckCdNm, String useAt) {
        this.update(bndtCeckCdNm, useAt, null);
    }

    public void update(String bndtCeckCdNm, String useAt, String userId) {
        this.bndtCeckCdNm = bndtCeckCdNm;
        this.useAt = useAt;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}
