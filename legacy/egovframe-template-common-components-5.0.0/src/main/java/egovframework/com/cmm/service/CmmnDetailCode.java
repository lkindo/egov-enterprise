package egovframework.com.cmm.service;

import java.io.Serializable;

/**
 * 怨듯넻?곸꽭肄붾뱶 紐⑤뜽 ?대옒??
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
 *   2017.09.07	?댁젙?		?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑(clCode 異붽?)
 *
 * </pre>
 */
public class CmmnDetailCode implements Serializable {

	private static final long serialVersionUID = 1L;

	/*
	 * 遺꾨쪟肄붾뱶
	 */
	private String clCode = "";

	/*
	 * 肄붾뱶ID
	 */
    private String codeId = "";

    /*
     * 肄붾뱶ID紐?
     */
    private String codeIdNm = "";

    /*
     * ?곸꽭肄붾뱶
     */
	private String code = "";

	/*
	 * ?곸꽭肄붾뱶紐?
	 */
    private String codeNm = "";

    /*
     * ?곸꽭肄붾뱶?ㅻ챸
     */
    private String codeDc = "";

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
	 * code attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCode() {
		return code;
	}

	/**
	 * code attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param code String
	 */
	public void setCode(String code) {
		this.code = code;
	}

	/**
	 * codeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCodeNm() {
		return codeNm;
	}

	/**
	 * codeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param codeNm String
	 */
	public void setCodeNm(String codeNm) {
		this.codeNm = codeNm;
	}

	/**
	 * codeDc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCodeDc() {
		return codeDc;
	}

	/**
	 * codeDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param codeDc String
	 */
	public void setCodeDc(String codeDc) {
		this.codeDc = codeDc;
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
