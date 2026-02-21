package egovframework.com.sym.ccm.zip.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;

/**
 * ??????????
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
 *   2009.04.01  ????		????
 *   2011.11.21  ????		?????(rdmn, bdnbrMnnm, bdnbrSlno, buldNm, detailBuldNm)
 *   2024.10.29	 ??		??BindingResult ??? @NotEmpty ??
 *
 * </pre>
 **/
public class Zip implements Serializable {

	private static final long serialVersionUID = -8767083970521429218L;

	/*
	 * ???
	 */
	@NotEmpty(message = "?                  ??common.required.msg}")
    private String zip            = "";

    /*
     * ????
     */
    private int    sn             = 0;

    /*
     * ???
     */
    @NotEmpty(message = "??         ?common.required.msg}")
	private String ctprvnNm       = "";

	/*
	 * ???
	 */
	@NotEmpty(message = "??      ?         {common.required.msg}")
    private String signguNm       = "";

    /*
     * ????
     */
    @NotEmpty(message = "??      ??      {common.required.msg}")
    private String emdNm          = "";

    /*
     * ???
     */
    private String liBuldNm      = "";

    /*
     * ????
     */
    private String rdmnCode       = "";

	/*
     * ??
     */
    private String rdmn       = "";

    /*
     * ??
     */
    private String bdnbrMnnm          = "";

    /*
     * ????
     */
    private String bdnbrSlno      = "";

    /*
     * ??
     */
    private String buldNm      = "";

    /*
     * ???
     */
    private String detailBuldNm      = "";

    /*
     * ???
     */
    private String lnbrDongHo     = "";

	/*
     * ???
     */
    private String frstRegisterId = "";

    /*
     * ???
     */
    private String lastUpdusrId   = "";

	/**
	 * zip attribute ?????.
	 * @return String
	 **/
	public String getZip() {
		return zip;
	}

	/**
	 * zip attribute ???????.
	 * @param zip String
	 **/
	public void setZip(String zip) {
		this.zip = zip;
	}

	/**
	 * sn attribute ?????.
	 * @return int
	 **/
	public int getSn() {
		return sn;
	}

	/**
	 * sn attribute ???????.
	 * @param sn int
	 **/
	public void setSn(int sn) {
		this.sn = sn;
	}

	/**
	 * ctprvnNm attribute ?????.
	 * @return String
	 **/
	public String getCtprvnNm() {
		return ctprvnNm;
	}

	/**
	 * ctprvnNm attribute ???????.
	 * @param ctprvnNm String
	 **/
	public void setCtprvnNm(String ctprvnNm) {
		this.ctprvnNm = ctprvnNm;
	}

	/**
	 * signguNm attribute ?????.
	 * @return String
	 **/
	public String getSignguNm() {
		return signguNm;
	}

	/**
	 * signguNm attribute ???????.
	 * @param signguNm String
	 **/
	public void setSignguNm(String signguNm) {
		this.signguNm = signguNm;
	}

	/**
	 * emdNm attribute ?????.
	 * @return String
	 **/
	public String getEmdNm() {
		return emdNm;
	}

	/**
	 * emdNm attribute ???????.
	 * @param emdNm String
	 **/
	public void setEmdNm(String emdNm) {
		this.emdNm = emdNm;
	}

	/**
	 * liBuldNm attribute ?????.
	 * @return String
	 **/
	public String getLiBuldNm() {
		return liBuldNm;
	}

	/**
	 * liBuldNm attribute ???????.
	 * @param liBuldNm String
	 **/
	public void setLiBuldNm(String liBuldNm) {
		this.liBuldNm = liBuldNm;
	}

	/**
	 * lnbrDongHo attribute ?????.
	 * @return String
	 **/
	public String getLnbrDongHo() {
		return lnbrDongHo;
	}

	/**
	 * lnbrDongHo attribute ???????.
	 * @param lnbrDongHo String
	 **/
	public void setLnbrDongHo(String lnbrDongHo) {
		this.lnbrDongHo = lnbrDongHo;
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

	public String getRdmn() {
		return rdmn;
	}

	public void setRdmn(String rdmn) {
		this.rdmn = rdmn;
	}

	public String getBdnbrMnnm() {
		return bdnbrMnnm;
	}

	public void setBdnbrMnnm(String bdnbrMnnm) {
		this.bdnbrMnnm = bdnbrMnnm;
	}

	public String getBdnbrSlno() {
		return bdnbrSlno;
	}

	public void setBdnbrSlno(String bdnbrSlno) {
		this.bdnbrSlno = bdnbrSlno;
	}

	public String getBuldNm() {
		return buldNm;
	}

	public void setBuldNm(String buldNm) {
		this.buldNm = buldNm;
	}

	public String getDetailBuldNm() {
		return detailBuldNm;
	}

	public void setDetailBuldNm(String detailBuldNm) {
		this.detailBuldNm = detailBuldNm;
	}

    public String getRdmnCode() {
		return rdmnCode;
	}

	public void setRdmnCode(String rdmnCode) {
		this.rdmnCode = rdmnCode;
	}
}
