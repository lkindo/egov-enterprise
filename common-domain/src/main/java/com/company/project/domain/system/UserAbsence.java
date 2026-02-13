package com.company.project.domain.system;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NUSERABSNCE")
public class UserAbsence extends BaseEntity {

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "USER_NM", length = 60)
    private String userNm;

    @Column(name = "USER_ABSNCE_AT", length = 1)
    private String userAbsnceAt;

    @Column(name = "REG_YN", length = 1)
    private String regYn;
}
