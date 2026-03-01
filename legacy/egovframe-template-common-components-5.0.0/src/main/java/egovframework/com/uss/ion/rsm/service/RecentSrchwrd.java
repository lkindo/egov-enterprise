package egovframework.com.uss.ion.rsm.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 理쒓렐寃?됱뼱 VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class RecentSrchwrd extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = 4031295690314547576L;

	/** 理쒓렐寃?됱뼱愿由촇D */
    private String srchwrdManageId;

    /** 理쒓렐寃?됱뼱愿由щ챸 */
    private String srchwrdManageNm;

    /** 理쒓렐寃?됱뼱愿由촗RL */
    private String srchwrdManageUrl;

    /** 理쒓렐寃?됱뼱?ъ슜?먭??됱뿬遺 */
    private String srchwrdManageUseYn;

    /** 理쒓렐寃?됱뼱ID */
    private String srchwrdId;

    /** 理쒓렐寃?됱뼱紐?*/
    private String srchwrdNm;

    /** 理쒓렐嫄댁깋?닿굔??*/
    private String srchwrdCnt;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

    /** 而⑦듃濡?紐낅졊??*/
    private String cmd;

    /** Ajax寃?됱뼱 */
    private String q;

    /**
     * srchwrdManageId 由ы꽩
     *
     * @return the srchwrdManageId
     */
    public String getSrchwrdManageId() {
        return srchwrdManageId;
    }

    /**
     * srchwrdManageId ?ㅼ젙
     *
     * @param srchwrdManageId the srchwrdManageId to set
     */
    public void setSrchwrdManageId(String srchwrdManageId) {
        this.srchwrdManageId = srchwrdManageId;
    }

    /**
     * srchwrdManageNm 由ы꽩
     *
     * @return the srchwrdManageNm
     */
    public String getSrchwrdManageNm() {
        return srchwrdManageNm;
    }

    /**
     * srchwrdManageNm ?ㅼ젙
     *
     * @param srchwrdManageNm the srchwrdManageNm to set
     */
    public void setSrchwrdManageNm(String srchwrdManageNm) {
        this.srchwrdManageNm = srchwrdManageNm;
    }

    /**
     * srchwrdManageUrl 由ы꽩
     *
     * @return the srchwrdManageUrl
     */
    public String getSrchwrdManageUrl() {
        return srchwrdManageUrl;
    }

    /**
     * srchwrdManageUrl ?ㅼ젙
     *
     * @param srchwrdManageUrl the srchwrdManageUrl to set
     */
    public void setSrchwrdManageUrl(String srchwrdManageUrl) {
        this.srchwrdManageUrl = srchwrdManageUrl;
    }

    /**
     * srchwrdManageUseYn 由ы꽩
     *
     * @return the srchwrdManageUseYn
     */
    public String getSrchwrdManageUseYn() {
        return srchwrdManageUseYn;
    }

    /**
     * srchwrdManageUseYn ?ㅼ젙
     *
     * @param srchwrdManageUseYn the srchwrdManageUseYn to set
     */
    public void setSrchwrdManageUseYn(String srchwrdManageUseYn) {
        this.srchwrdManageUseYn = srchwrdManageUseYn;
    }

    /**
     * srchwrdId 由ы꽩
     *
     * @return the srchwrdId
     */
    public String getSrchwrdId() {
        return srchwrdId;
    }

    /**
     * srchwrdId ?ㅼ젙
     *
     * @param srchwrdId the srchwrdId to set
     */
    public void setSrchwrdId(String srchwrdId) {
        this.srchwrdId = srchwrdId;
    }

    /**
     * srchwrdNm 由ы꽩
     *
     * @return the srchwrdNm
     */
    public String getSrchwrdNm() {
        return srchwrdNm;
    }

    /**
     * srchwrdNm ?ㅼ젙
     *
     * @param srchwrdNm the srchwrdNm to set
     */
    public void setSrchwrdNm(String srchwrdNm) {
        this.srchwrdNm = srchwrdNm;
    }

    /**
     * srchwrdCnt 由ы꽩
     *
     * @return the srchwrdCnt
     */
    public String getSrchwrdCnt() {
        return srchwrdCnt;
    }

    /**
     * srchwrdCnt ?ㅼ젙
     *
     * @param srchwrdCnt the srchwrdCnt to set
     */
    public void setSrchwrdCnt(String srchwrdCnt) {
        this.srchwrdCnt = srchwrdCnt;
    }

    /**
     * frstRegisterPnttm 由ы꽩
     *
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm ?ㅼ젙
     *
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId 由ы꽩
     *
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId ?ㅼ젙
     *
     * @param frstRegisterId the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * lastUpdusrPnttm 由ы꽩
     *
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm ?ㅼ젙
     *
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * lastUpdusrId 由ы꽩
     *
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId ?ㅼ젙
     *
     * @param lastUpdusrId the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * cmd 由ы꽩
     *
     * @return the cmd
     */
    public String getCmd() {
        return cmd;
    }

    /**
     * cmd ?ㅼ젙
     *
     * @param cmd the cmd to set
     */
    public void setCmd(String cmd) {
        this.cmd = cmd;
    }

    /**
     * q 由ы꽩
     *
     * @return the q
     */
    public String getQ() {
        return q;
    }

    /**
     * q ?ㅼ젙
     *
     * @param q the q to set
     */
    public void setQ(String q) {
        this.q = q;
    }

}
