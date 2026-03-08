package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 獄쏄퀣??臾믩씜 JPA Entity
 * ??뉕탢?????뵠?? COMTNBATCHOPERT
 */
@Entity
@Table(name = "NBATCHOPERT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BatchOpert {

    @Id
    @Column(name = "BATCH_OPERT_ID", length = 20)
    private String batchOpertId;

    @Column(name = "BATCH_OPERT_NM", length = 100, nullable = false)
    private String batchOpertNm;

    @Column(name = "BATCH_PROGRM", length = 255)
    private String batchProgrm;

    @Column(name = "PARAMTR", length = 500)
    private String paramtr;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    public void update(String batchOpertNm, String batchProgrm, String paramtr,
            String useAt, String updusrId) {
        this.batchOpertNm = batchOpertNm;
        this.batchProgrm = batchProgrm;
        this.paramtr = paramtr;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
