package egovframework.com.cmm.service;

import java.io.Serializable;

/**
 * ????????????
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *   2017.09.07	????		???????v3.7 ?clCode ??)
 *
 * </pre>
 **/
public class CmmnDetailCode implements Serializable {

	private static final long serialVersionUID = 1L;

	/*
	 * ?
	 */
	private String clCode = "";

	/*
	 * ?D
	 */
    private String codeId = "";

    /*
     * ?D?
     */
    private String codeIdNm = "";

    /*
     * ???
     */
	private String code = "";

	/*
	 * ???
	 */
    private String codeNm = "";

    /*
     * ????
     */
    private String codeDc = "";

    /*
     * ??????
     */
    private String useAt = "";

    /*
     * ???
     */
    private String frstRegisterId = "";

    /*
     * ???
     */
    private String lastUpdusrId   = "";


    /**
     * clCode attribute ?????.
     * @return String
     **/
    public String getClCode() {
    	return clCode;
    }
    
    /**
     * clCode attribute ???????.
     * @param clCode String
     **/
    public void setClCode(String clCode) {
    	this.clCode = clCode;
    }

    /**
	 * codeId attribute ?????.
	 * @return String
	 **/
	public String getCodeId() {
		return codeId;
	}

	/**
	 * codeId attribute ???????.
	 * @param codeId String
	 **/
	public void setCodeId(String codeId) {
		this.codeId = codeId;
	}

	/**
	 * codeIdNm attribute ?????.
	 * @return String
	 **/
	public String getCodeIdNm() {
		return codeIdNm;
	}

	/**
	 * codeIdNm attribute ???????.
	 * @param codeIdNm String
	 **/
	public void setCodeIdNm(String codeIdNm) {
		this.codeIdNm = codeIdNm;
	}

	/**
	 * code attribute ?????.
	 * @return String
	 **/
	public String getCode() {
		return code;
	}

	/**
	 * code attribute ???????.
	 * @param code String
	 **/
	public void setCode(String code) {
		this.code = code;
	}

	/**
	 * codeNm attribute ?????.
	 * @return String
	 **/
	public String getCodeNm() {
		return codeNm;
	}

	/**
	 * codeNm attribute ???????.
	 * @param codeNm String
	 **/
	public void setCodeNm(String codeNm) {
		this.codeNm = codeNm;
	}

	/**
	 * codeDc attribute ?????.
	 * @return String
	 **/
	public String getCodeDc() {
		return codeDc;
	}

	/**
	 * codeDc attribute ???????.
	 * @param codeDc String
	 **/
	public void setCodeDc(String codeDc) {
		this.codeDc = codeDc;
	}

	/**
	 * useAt attribute ?????.
	 * @return String
	 **/
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute ???????.
	 * @param useAt String
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * @return String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * @param frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * @return String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * @param lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}


}
