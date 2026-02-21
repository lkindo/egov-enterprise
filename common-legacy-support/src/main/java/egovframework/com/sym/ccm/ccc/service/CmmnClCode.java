package egovframework.com.sym.ccm.ccc.service;

import java.io.Serializable;

/**
 * ???????????
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
public class  CmmnClCode implements Serializable {

	private static final long serialVersionUID = 4861619118930452502L;

	/*
	 * ?
	 */
	private String clCode = "";

	/*
	 * ??
	 */
    private String clCodeNm = "";

    /*
     * ???
     */
    private String clCodeDc = "";

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
	 * clCodeDc attribute ?????.
	 * @return String
	 **/
	public String getClCodeDc() {
		return clCodeDc;
	}

	/**
	 * clCodeDc attribute ???????.
	 * @param clCodeDc String
	 **/
	public void setClCodeDc(String clCodeDc) {
		this.clCodeDc = clCodeDc;
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
