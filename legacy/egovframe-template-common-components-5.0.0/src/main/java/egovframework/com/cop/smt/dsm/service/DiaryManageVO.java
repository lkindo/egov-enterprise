package egovframework.com.cop.smt.dsm.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?쇱?愿由?VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class DiaryManageVO extends ComDefaultVO implements Serializable {
	
	/** ?쇱?ID */
	private String diaryId;
	
	/** ?쇱젙?댁슜 */
	private String schdulCn;
	
	/** ?쇱젙ID */
	private String schdulId;
	
	/** 吏꾩쿃瑜?*/
	private String diaryProcsPte;
	
	/** ?쇱젙紐?*/
	private String diaryNm;
	
	/** 吏吏?ы빆 */
	private String drctMatter;
	
	/** ?뱀씠?ы빆 */
	private String partclrMatter;
	
	/** 泥⑤??뚯씪 */
	private String atchFileId;
	
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	
	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";
	
	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";
	
	/** 理쒖쥌?섏젙ID */
	private String lastUpdusrId = "";

	/**
	 * diaryId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getDiaryId() {
		return diaryId;
	}

	/**
	 * diaryId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return diaryId String
	 */
	public void setDiaryId(String diaryId) {
		this.diaryId = diaryId;
	}

	/**
	 * schdulCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulCn() {
		return schdulCn;
	}

	/**
	 * schdulCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulCn String
	 */
	public void setSchdulCn(String schdulCn) {
		this.schdulCn = schdulCn;
	}

	/**
	 * schdulId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulId() {
		return schdulId;
	}

	/**
	 * schdulId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulId String
	 */
	public void setSchdulId(String schdulId) {
		this.schdulId = schdulId;
	}

	/**
	 * diaryProcsPte attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getDiaryProcsPte() {
		return diaryProcsPte;
	}

	/**
	 * diaryProcsPte attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return diaryProcsPte String
	 */
	public void setDiaryProcsPte(String diaryProcsPte) {
		this.diaryProcsPte = diaryProcsPte;
	}

	/**
	 * diaryNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getDiaryNm() {
		return diaryNm;
	}

	/**
	 * diaryNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return diaryNm String
	 */
	public void setDiaryNm(String diaryNm) {
		this.diaryNm = diaryNm;
	}

	/**
	 * drctMatter attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getDrctMatter() {
		return drctMatter;
	}

	/**
	 * drctMatter attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return drctMatter String
	 */
	public void setDrctMatter(String drctMatter) {
		this.drctMatter = drctMatter;
	}

	/**
	 * partclrMatter attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getPartclrMatter() {
		return partclrMatter;
	}

	/**
	 * partclrMatter attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return partclrMatter String
	 */
	public void setPartclrMatter(String partclrMatter) {
		this.partclrMatter = partclrMatter;
	}

	/**
	 * atchFileId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return atchFileId String
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
 
	
}
