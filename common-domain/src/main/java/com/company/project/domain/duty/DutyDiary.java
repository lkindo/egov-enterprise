package com.company.project.domain.duty;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serializable;

/**
 * 당직일지 결과 관리 엔티티
 */
@Entity
@Table(name = "NBNDTDIARY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DutyDiary extends BaseTimeEntity {

    @EmbeddedId
    private DutyDiaryId id;

    @Column(name = "CHCK_STTUS", length = 1, nullable = false)
    private String chckSttus;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class DutyDiaryId implements Serializable {
        @Column(name = "BNDT_ID", length = 20)
        private String bndtId;

        @Column(name = "BNDT_DE", length = 20)
        private String bndtDe;

        @Column(name = "BNDT_CECK_SE", length = 2)
        private String bndtCeckSe;

        @Column(name = "BNDT_CECK_CODE", length = 2)
        private String bndtCeckCd;
    }

    public void update(String chckSttus, String lastUpdusrId) {
        this.chckSttus = chckSttus;
        this.lastUpdusrId = lastUpdusrId;
    }
}
