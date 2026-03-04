package com.company.project.domain.holiday;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ??곸뵬 JPA Entity
 * ??뉕탢?????뵠?? COMTNRESTDE
 */
@Entity
@Table(name = "NRESTDE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RESTDE_NO")
    private Integer restdeNo;

    @Column(name = "RESTDE_DE", length = 8, nullable = false)
    private String restdeDe;

    @Column(name = "RESTDE_NM", length = 100, nullable = false)
    private String restdeNm;

    @Column(name = "RESTDE_DC", length = 500)
    private String restdeDc;

    @Column(name = "RESTDE_SE", length = 20)
    private String restdeSe;

    @Column(name = "RESTDE_SE_CODE", length = 20)
    private String restdeSeCode;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Holiday(String restdeDe, String restdeNm, String restdeDc,
            String restdeSe, String restdeSeCode, String frstRegisterId) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSe = restdeSe;
        this.restdeSeCode = restdeSeCode;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String restdeDe, String restdeNm, String restdeDc,
            String restdeSe, String restdeSeCode, String updusrId) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSe = restdeSe;
        this.restdeSeCode = restdeSeCode;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public String getFormattedRestdeDe() {
        if (restdeDe != null && restdeDe.length() == 8 && restdeDe.matches("\\d{8}")) {
            return restdeDe.substring(0, 4) + "-" + restdeDe.substring(4, 6) + "-" + restdeDe.substring(6, 8);
        }
        return restdeDe;
    }
}