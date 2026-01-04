package com.company.project.domain.duty;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serializable;

/**
 * 당직 체크항목 관리 엔티티
 */
@Entity
@Table(name = "NBNDTCECKMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DutyCheck extends BaseTimeEntity {

    @EmbeddedId
    private DutyCheckId id;

    @Column(name = "BNDT_CECK_CODE_NM", length = 255, nullable = false)
    private String bndtCeckCdNm;

    @Column(name = "USE_AT", length = 1, nullable = false)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class DutyCheckId implements Serializable {
        @Column(name = "BNDT_CECK_SE", length = 2)
        private String bndtCeckSe;

        @Column(name = "BNDT_CECK_CODE", length = 2)
        private String bndtCeckCd;
    }

    public void update(String bndtCeckCdNm, String useAt, String lastUpdusrId) {
        this.bndtCeckCdNm = bndtCeckCdNm;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
