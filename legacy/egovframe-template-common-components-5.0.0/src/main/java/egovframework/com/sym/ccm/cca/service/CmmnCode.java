package egovframework.com.sym.ccm.cca.service;

import java.io.Serializable;

/**
* 怨듯넻肄붾뱶 紐⑤뜽 ?대옒??
* @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
* @since 2009.04.01
* @version 1.0
* @see
*
* <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  -------    --------    ---------------------------
*   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
*
* </pre>
*/

public class CmmnCode implements Serializable {

	private static final long serialVersionUID = 638950577710720796L;

	/*
	 * 肄붾뱶ID
	 */
	private String codeId = "";

	/*
	 * 肄붾뱶ID紐?
	 */
	private String codeIdNm = "";

	/*
	 * 肄붾뱶ID?ㅻ챸
	 */
	private String codeIdDc = "";

	/*
	 * 遺꾨쪟肄붾뱶
	 */
	private String clCode = "";

	/*
	 * 遺꾨쪟肄붾뱶紐?
	 */
	private String clCodeNm = "";

	/*
	 * ?ъ슜?щ?
	 */
    private String useAt = "";

    /*
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";

    /*
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId   = "";

	/**
	 * codeId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCodeId() {
		return codeId;
	}

	/**
	 * codeId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param codeId String
	 */
	public void setCodeId(String codeId) {
		this.codeId = codeId;
	}

	/**
	 * codeIdNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCodeIdNm() {
		return codeIdNm;
	}

	/**
	 * codeIdNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param codeIdNm String
	 */
	public void setCodeIdNm(String codeIdNm) {
		this.codeIdNm = codeIdNm;
	}

	/**
	 * codeIdDc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCodeIdDc() {
		return codeIdDc;
	}

	/**
	 * codeIdDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param codeIdDc String
	 */
	public void setCodeIdDc(String codeIdDc) {
		this.codeIdDc = codeIdDc;
	}

	/**
	 * clCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getClCode() {
		return clCode;
	}

	/**
	 * clCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param clCode String
	 */
	public void setClCode(String clCode) {
		this.clCode = clCode;
	}

	/**
	 * clCodeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getClCodeNm() {
		return clCodeNm;
	}

	/**
	 * clCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param clCodeNm String
	 */
	public void setClCodeNm(String clCodeNm) {
		this.clCodeNm = clCodeNm;
	}

	/**
	 * useAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useAt String
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}


}
