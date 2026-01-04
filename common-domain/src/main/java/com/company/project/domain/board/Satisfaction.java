package com.company.project.domain.board;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "COMTNBBSSATISFACTION")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Satisfaction extends BaseTimeEntity {

    @Id
    @Column(name = "STSFDG_ID", length = 20)
    private String satisfactionId;

    @Column(name = "NTT_ID", nullable = false)
    private Long articleId;

    @Column(name = "BBS_ID", length = 20, nullable = false)
    private String boardId;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "STSFDG", nullable = false)
    private Integer satisfactionLevel;

    @Column(name = "STSFDG_CN", length = 2500)
    private String satisfactionOpinion;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(Integer satisfactionLevel, String satisfactionOpinion, String lastUpdusrId, String password) {
        this.satisfactionLevel = satisfactionLevel;
        this.satisfactionOpinion = satisfactionOpinion;
        this.lastUpdusrId = lastUpdusrId;
        if (password != null && !password.isEmpty()) {
            this.password = password;
        }
    }
}
