package com.company.project.domain.integration;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ?怨뚰?疫꿸퀗? ?酉???
 */
@Entity
@Table(name = "NCNTCINSTT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CntcInstt extends BaseEntity {

    @Id
    @Column(name = "INSTT_ID", length = 20)
    private String insttId;

    @Column(name = "INSTT_NM", nullable = false, length = 100)
    private String insttNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String insttNm, String useAt) {
        this.insttNm = insttNm;
        this.useAt = useAt;
    }
}