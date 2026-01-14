package com.company.project.domain.vacation;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;

/**
 * 사용자 부재 관리 엔티티
 */
@Entity(name = "CommonUserAbsence")
@Table(name = "NUSERABSNCE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserAbsence extends BaseTimeEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String userId;

    @Column(name = "USER_ABSNCE_AT", length = 1, nullable = false)
    private String userAbsnceAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void updateAbsence(String userAbsnceAt, String lastUpdusrId) {
        this.userAbsnceAt = userAbsnceAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
