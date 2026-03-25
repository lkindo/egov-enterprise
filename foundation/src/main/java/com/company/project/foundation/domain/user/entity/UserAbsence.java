package com.company.project.foundation.domain.user.entity;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 사용자 부재 정보 엔티티
 */
@Entity
@Table(name = "COMTNUSERABSENCE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserAbsence extends BaseEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "USER_ABSNCE_AT", length = 1, nullable = false)
    private String userAbsnceAt; // Y: 부재, N: 정상

    public void updateAbsence(String userAbsnceAt) {
        this.userAbsnceAt = userAbsnceAt;
    }
}
