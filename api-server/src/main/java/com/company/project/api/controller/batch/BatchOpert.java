package com.company.project.api.controller.batch;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 배치작업관리에 대한 model 클래스
 * Relocated to avoid legacy package conflicts.
 */
public class BatchOpert extends ComDefaultVO {

    private static final long serialVersionUID = -8854151716958649397L;
    private String batchOpertId;
    private String batchOpertNm;
    private String batchProgrm;
    private String lastUpdusrId;
    private String lastUpdusrPnttm;
    private String paramtr;
    private String useAt;
    private String frstRegisterId;
    private String frstRegisterPnttm;

    public String getBatchOpertId() {
        return batchOpertId;
    }

    public void setBatchOpertId(String batchOpertId) {
        this.batchOpertId = batchOpertId;
    }

    public String getBatchOpertNm() {
        return batchOpertNm;
    }

    public void setBatchOpertNm(String batchOpertNm) {
        this.batchOpertNm = batchOpertNm;
    }

    public String getBatchProgrm() {
        return batchProgrm;
    }

    public void setBatchProgrm(String batchProgrm) {
        this.batchProgrm = batchProgrm;
    }

    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    public String getParamtr() {
        return paramtr;
    }

    public void setParamtr(String paramtr) {
        this.paramtr = paramtr;
    }

    public String getUseAt() {
        return useAt;
    }

    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }

    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }
}
