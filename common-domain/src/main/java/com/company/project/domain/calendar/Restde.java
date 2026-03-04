package com.company.project.domain.calendar;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ??곸뵬 ?온???酉???
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NCALRESTDE")
public class Restde extends BaseTimeEntity {

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

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String restdeDe, String restdeNm, String restdeDc, String restdeSeCode, String lastUpdusrId) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSeCode = restdeSeCode;
        this.lastUpdusrId = lastUpdusrId;
    }
}