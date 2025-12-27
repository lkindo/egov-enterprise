package com.company.project.domain.user;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NUSERABSNCE")
public class UserAbsence extends BaseTimeEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String userId;

    @Column(name = "USER_ABSNCE_AT", length = 1, nullable = false)
    private String userAbsnceAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public UserAbsence(String userId, String userAbsnceAt, String frstRegisterId, String lastUpdusrId) {
        this.userId = userId;
        this.userAbsnceAt = userAbsnceAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void update(String userAbsnceAt, String lastUpdusrId) {
        this.userAbsnceAt = userAbsnceAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
