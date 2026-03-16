package com.company.project.domain.log;
import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "SSYSLOGSUMMARY")
@IdClass(SysLogSummaryId.class)
@SuperBuilder
public class SysLogSummary extends BaseEntity {

    @Id
    @Column(name = "SRVC_NM", length = 60)
    private String srvcNm;

    @Id
    @Column(name = "METHOD_NM", length = 20)
    private String methodNm;

    @Id
    @Column(name = "OCCRRNC_DE", length = 8)
    private String occrrncDe;

    @Column(name = "CREAT_CO")
    private Long creatCo;

    @Column(name = "UPDT_CO")
    private Long updtCo;

    @Column(name = "RDCNT")
    private Long rdcnt;

    @Column(name = "DELETE_CO")
    private Long deleteCo;

    @Column(name = "OUTPT_CO")
    private Long outptCo;

    @Column(name = "ERROR_CO")
    private Long errorCo;
}
