package com.company.project.domain.calendar;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 휴일 정보 엔티티
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "NCALRESTDE")
public class Restde extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RESTDE_NO")
    private Integer restdeNo;

    @Column(name = "RESTDE_DE", length = 8)
    private String restdeDe;

    @Column(name = "RESTDE_NM", length = 60)
    private String restdeNm;

    @Column(name = "RESTDE_DC", length = 200)
    private String restdeDc;

    @Column(name = "RESTDE_SE_CODE", length = 1)
    private String restdeSeCode;

    public void update(String restdeDe, String restdeNm, String restdeDc, String restdeSeCode) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSeCode = restdeSeCode;
    }
}
