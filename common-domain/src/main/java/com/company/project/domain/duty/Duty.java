package com.company.project.domain.duty;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serializable;

/**
 * 당직 관리 엔티티
 */
@Entity
@Table(name = "NBNDTMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Duty extends BaseTimeEntity {

    @EmbeddedId
    private DutyId id;

    @Column(name = "RM", length = 255)
    private String remark;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class DutyId implements Serializable {
        @Column(name = "BNDT_ID", length = 20)
        private String bndtId;

        @Column(name = "BNDT_DE", length = 20)
        private String bndtDe;
    }

    public void update(String remark, String lastUpdusrId) {
        this.remark = remark;
        this.lastUpdusrId = lastUpdusrId;
    }
}
