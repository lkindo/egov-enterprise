package egovframework.com.sym.ccm.cca.service;

import java.io.Serializable;

/**
* ?? ???????
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
*
* </pre>
**/

public class CmmnCode implements Serializable {

	private static final long serialVersionUID = 638950577710720796L;

	/*
	 * ?D
	 */
	private String codeId = "";

	/*
	 * ?D?
	 */
	private String codeIdNm = "";

	/*
	 * ?D??
	 */
	private String codeIdDc = "";

	/*
	 * ?
	 */
	private String clCode = "";

	/*
	 * ??
	 */
	private String clCodeNm = "";

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
	 * codeIdDc attribute ?????.
	 * @return String
	 **/
	public String getCodeIdDc() {
		return codeIdDc;
	}

	/**
	 * codeIdDc attribute ???????.
	 * @param codeIdDc String
	 **/
	public void setCodeIdDc(String codeIdDc) {
		this.codeIdDc = codeIdDc;
	}

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
	 * clCodeNm attribute ?????.
	 * @return String
	 **/
	public String getClCodeNm() {
		return clCodeNm;
	}

	/**
	 * clCodeNm attribute ???????.
	 * @param clCodeNm String
	 **/
	public void setClCodeNm(String clCodeNm) {
		this.clCodeNm = clCodeNm;
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
