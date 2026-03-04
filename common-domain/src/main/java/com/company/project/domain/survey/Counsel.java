package com.company.project.domain.survey;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NCNSLTMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Counsel extends BaseTimeEntity {

    @Id
    @Column(name = "CNSLT_ID", length = 20)
    private String counselId;

    @Column(name = "CNSLT_SJ", length = 255, nullable = false)
    private String counselSubject;

    @Column(name = "CNSLT_CN", length = 4000)
    private String counselContent;

    @Column(name = "OTHBC_AT", length = 1)
    private String openAt;

    @Column(name = "WRITNG_DE", length = 20)
    private String writeDate;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "MANAGT_CN", length = 4000)
    private String managerContent;

    @Column(name = "MANAGT_DE", length = 20)
    private String managerDate;

    @Column(name = "QNA_PROCESS_STTUS_CODE", length = 1)
    private String status; // 1:?臾믩땾, 2:????袁⑥┷

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void updateAnswer(String managerContent, String managerDate, String status, String lastUpdusrId) {
        this.managerContent = managerContent;
        this.managerDate = managerDate;
        this.status = status;
        this.lastUpdusrId = lastUpdusrId;
    }
}