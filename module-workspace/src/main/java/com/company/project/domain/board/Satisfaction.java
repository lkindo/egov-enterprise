package com.company.project.domain.board;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 만족도 조사 엔티티
 * 매핑 테이블: NSTSFDG
 */
@Entity
@Table(name = "NSTSFDG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Satisfaction extends BaseEntity {

    @Id
    @Column(name = "STSFDG_NO")
    private Long id;

    @Column(name = "NTT_ID", nullable = false)
    private Long articleId;

    @Column(name = "BBS_ID", length = 20, nullable = false)
    private String boardId;

    @Column(name = "WRTER_ID", length = 20)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "STSFDG", nullable = false)
    private Integer satisfactionLevel;

    @Column(name = "STSFDG_CN", length = 2500)
    private String satisfactionOpinion;

    @Builder.Default
    @Column(name = "USE_AT", length = 1)
    private String useAt = "Y";

    public void update(Integer satisfactionLevel, String satisfactionOpinion, String password) {
        this.satisfactionLevel = satisfactionLevel;
        this.satisfactionOpinion = satisfactionOpinion;
        if (password != null && !password.isEmpty()) {
            this.password = password;
        }
    }

    public void delete() {
        this.useAt = "N";
    }
}
