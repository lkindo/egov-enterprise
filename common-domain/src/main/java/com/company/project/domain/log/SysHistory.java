package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "HSYSHIST")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SysHistory {

    @Id
    @Column(name = "HIST_ID", length = 20)
    private String histId;

    @Column(name = "SYS_NM", length = 255)
    private String sysNm;

    @Column(name = "HIST_SE_CODE", length = 6)
    private String histSeCode;

    @Column(name = "HIST_CN")
    private String histCn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;
}