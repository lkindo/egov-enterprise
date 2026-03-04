package com.company.project.domain.trouble;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "NTROBLINFO")
public class Trobl extends BaseEntity {

    @Id
    @Column(name = "TROBL_ID", length = 20)
    private String troblId;

    @Column(name = "TROBL_NM", length = 60)
    private String troblNm;

    @Column(name = "TROBL_KND", length = 2)
    private String troblKnd;

    @Column(name = "TROBL_DC", length = 2000)
    private String troblDc;

    @Column(name = "TROBL_OCCRRNC_TIME", length = 14)
    private String troblOccrrncTime;

    @Column(name = "TROBL_RQESTER_NM", length = 60)
    private String troblRqesterNm;

    @Column(name = "TROBL_REQUST_TIME", length = 14)
    private String troblRequstTime;

    @Column(name = "TROBL_PROCESS_RESULT", length = 2000)
    private String troblProcessResult;

    @Column(name = "TROBL_OPETR_NM", length = 60)
    private String troblOpetrNm;

    @Column(name = "TROBL_PROCESS_TIME", length = 14)
    private String troblProcessTime;

    @Column(name = "PROCESS_STTUS", length = 1)
    private String processSttus;

    // Missing method for compatibility
    public String getFrstRegisterId() {
        return this.getCreatedBy();
    }

    public void setFrstRegisterId(String frstRegisterId) {
        this.setCreatedBy(frstRegisterId);
    }
}