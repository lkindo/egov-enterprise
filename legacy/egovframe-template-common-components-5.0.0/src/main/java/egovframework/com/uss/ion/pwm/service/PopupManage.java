package egovframework.com.uss.ion.pwm.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?앹뾽李쎌뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?앹뾽李쎌쓽 ?앹뾽李쎌븘?대뵒, ?앹뾽李???댄?紐? ?ㅽ뙆??URL, ?뚯뾽李쎌씠 ?붾㈃??蹂댁뿬吏???꾩튂?뺣낫, ?앹뾽李쎌쓽 ?ъ씠利? 寃뚯떆?쒖옉?? 寃뚯떆醫낅즺??
 * 洹몃쭔蹂닿린 ?ㅼ젙 ?щ?, 寃뚯떆?щ? ??ぉ??愿由ы븳??
 * @author ?댁갹??
 * @version 1.0
 * @created 05-8-2009 ?ㅽ썑 2:21:03
 */
public class PopupManage extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -9172690166674188881L;
	/**
	 * ?앹뾽李쎌븘?대뵒
	 */
	private String popupId;
	/**
	 * ?앹뾽李???댄?紐?
	 */
	private String popupTitleNm;
	/**
	 * ?ㅽ뙆??URL
	 */
	private String fileUrl;
	/**
	 * ?앹뾽李쎌씠 ?붾㈃??蹂댁뿬吏??媛濡??꾩튂?뺣낫
	 */
	private String popupWlc;

        /**
         * ?앹뾽李쎌씠 ?붾㈃??蹂댁뿬吏???몃줈 ?꾩튂?뺣낫
         */
        private String popupHlc;

	/**
	 * ?앹뾽李쎌쓽 ?믪씠
	 */
	private String popupHSize;

        /**
         * ?앹뾽李쎌쓽 ?싳씠
         */
        private String popupWSize;

	/**
	 * 寃뚯떆?쒖옉??
	 */
	private String ntceBgnde;
	/**
	 * 寃뚯떆醫낅즺??
	 */
	private String ntceEndde;

	/** 寃뚯떆?쒖옉???쒓컙) */
        private String ntceBgndeHH;

        /** 寃뚯떆?쒖옉??遺? */
        private String ntceBgndeMM;

        /** 寃뚯떆醫낅즺???쒓컙) */
        private String ntceEnddeHH;

        /** 寃뚯떆醫낅즺??遺? */
        private String ntceEnddeMM;

	/**
	 * 洹몃쭔蹂닿린 ?ㅼ젙 ?щ?
	 */
	private String stopVewAt;
	/**
	 * 寃뚯떆?щ?
	 */
	private String ntceAt;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?꾩씠??*/
	private String frstRegisterId;

	/** 理쒖쥌?섏젙??*/
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙???꾩씠??*/
	private String lastUpdusrId;

	public PopupManage(){}

    /**
     * popupId 由ы꽩
     *
     * @return the popupId
     */
    public String getPopupId() {
        return popupId;
    }

    /**
     * popupId ?ㅼ젙
     *
     * @param popupId the popupId to set
     */
    public void setPopupId(String popupId) {
        this.popupId = popupId;
    }

    /**
     * popupTitleNm 由ы꽩
     *
     * @return the popupTitleNm
     */
    public String getPopupTitleNm() {
        return popupTitleNm;
    }

    /**
     * popupTitleNm ?ㅼ젙
     *
     * @param popupTitleNm the popupTitleNm to set
     */
    public void setPopupTitleNm(String popupTitleNm) {
        this.popupTitleNm = popupTitleNm;
    }

    /**
     * fileUrl 由ы꽩
     *
     * @return the fileUrl
     */
    public String getFileUrl() {
        return fileUrl;
    }

    /**
     * fileUrl ?ㅼ젙
     *
     * @param fileUrl the fileUrl to set
     */
    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    /**
     * popupWlc 由ы꽩
     *
     * @return the popupWlc
     */
    public String getPopupWlc() {
        return popupWlc;
    }

    /**
     * popupWlc ?ㅼ젙
     *
     * @param popupWlc the popupWlc to set
     */
    public void setPopupWlc(String popupWlc) {
        this.popupWlc = popupWlc;
    }

    /**
     * popupHlc 由ы꽩
     *
     * @return the popupHlc
     */
    public String getPopupHlc() {
        return popupHlc;
    }

    /**
     * popupHlc ?ㅼ젙
     *
     * @param popupHlc the popupHlc to set
     */
    public void setPopupHlc(String popupHlc) {
        this.popupHlc = popupHlc;
    }

    /**
     * popupHSize 由ы꽩
     *
     * @return the popupHSize
     */
    public String getPopupHSize() {
        return popupHSize;
    }

    /**
     * popupHSize ?ㅼ젙
     *
     * @param popupHSize the popupHSize to set
     */
    public void setPopupHSize(String popupHSize) {
        this.popupHSize = popupHSize;
    }

    /**
     * popupWSize 由ы꽩
     *
     * @return the popupWSize
     */
    public String getPopupWSize() {
        return popupWSize;
    }

    /**
     * popupWSize ?ㅼ젙
     *
     * @param popupWSize the popupWSize to set
     */
    public void setPopupWSize(String popupWSize) {
        this.popupWSize = popupWSize;
    }

    /**
     * ntceBgnde 由ы꽩
     *
     * @return the ntceBgnde
     */
    public String getNtceBgnde() {
        return ntceBgnde;
    }

    /**
     * ntceBgnde ?ㅼ젙
     *
     * @param ntceBgnde the ntceBgnde to set
     */
    public void setNtceBgnde(String ntceBgnde) {
        this.ntceBgnde = ntceBgnde;
    }

    /**
     * ntceEndde 由ы꽩
     *
     * @return the ntceEndde
     */
    public String getNtceEndde() {
        return ntceEndde;
    }

    /**
     * ntceEndde ?ㅼ젙
     *
     * @param ntceEndde the ntceEndde to set
     */
    public void setNtceEndde(String ntceEndde) {
        this.ntceEndde = ntceEndde;
    }

    /**
     * ntceBgndeHH 由ы꽩
     *
     * @return the ntceBgndeHH
     */
    public String getNtceBgndeHH() {
        return ntceBgndeHH;
    }

    /**
     * ntceBgndeHH ?ㅼ젙
     *
     * @param ntceBgndeHH the ntceBgndeHH to set
     */
    public void setNtceBgndeHH(String ntceBgndeHH) {
        this.ntceBgndeHH = ntceBgndeHH;
    }

    /**
     * ntceBgndeMM 由ы꽩
     *
     * @return the ntceBgndeMM
     */
    public String getNtceBgndeMM() {
        return ntceBgndeMM;
    }

    /**
     * ntceBgndeMM ?ㅼ젙
     *
     * @param ntceBgndeMM the ntceBgndeMM to set
     */
    public void setNtceBgndeMM(String ntceBgndeMM) {
        this.ntceBgndeMM = ntceBgndeMM;
    }

    /**
     * ntceEnddeHH 由ы꽩
     *
     * @return the ntceEnddeHH
     */
    public String getNtceEnddeHH() {
        return ntceEnddeHH;
    }

    /**
     * ntceEnddeHH ?ㅼ젙
     *
     * @param ntceEnddeHH the ntceEnddeHH to set
     */
    public void setNtceEnddeHH(String ntceEnddeHH) {
        this.ntceEnddeHH = ntceEnddeHH;
    }

    /**
     * ntceEnddeMM 由ы꽩
     *
     * @return the ntceEnddeMM
     */
    public String getNtceEnddeMM() {
        return ntceEnddeMM;
    }

    /**
     * ntceEnddeMM ?ㅼ젙
     *
     * @param ntceEnddeMM the ntceEnddeMM to set
     */
    public void setNtceEnddeMM(String ntceEnddeMM) {
        this.ntceEnddeMM = ntceEnddeMM;
    }

    /**
     * stopVewAt 由ы꽩
     *
     * @return the stopVewAt
     */
    public String getStopVewAt() {
        return stopVewAt;
    }

    /**
     * stopVewAt ?ㅼ젙
     *
     * @param stopVewAt the stopVewAt to set
     */
    public void setStopVewAt(String stopVewAt) {
        this.stopVewAt = stopVewAt;
    }

    /**
     * ntceAt 由ы꽩
     *
     * @return the ntceAt
     */
    public String getNtceAt() {
        return ntceAt;
    }

    /**
     * ntceAt ?ㅼ젙
     *
     * @param ntceAt the ntceAt to set
     */
    public void setNtceAt(String ntceAt) {
        this.ntceAt = ntceAt;
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




}
