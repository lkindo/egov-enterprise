package egovframework.com.sym.ccm.zip.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;

/**
 * ?고렪踰덊샇 紐⑤뜽 ?대옒??
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
 *   2009.04.01  ?댁쨷??		理쒖큹 ?앹꽦
 *   2011.11.21  ?닿린??		?꾨줈紐낆＜??異붽?(rdmn, bdnbrMnnm, bdnbrSlno, buldNm, detailBuldNm)
 *   2024.10.29	 沅뚰깭??		?꾩닔媛?BindingResult 寃利앹쓣 ?꾪븳 @NotEmpty 異붽?
 *
 * </pre>
 */
public class Zip implements Serializable {

	private static final long serialVersionUID = -8767083970521429218L;

	/*
	 * ?고렪踰덊샇
	 */
	@NotEmpty(message = "?고렪踰덊샇{common.required.msg}")
    private String zip            = "";

    /*
     * ?쇰젴踰덊샇
     */
    private int    sn             = 0;

    /*
     * ?쒕룄紐?
     */
    @NotEmpty(message = "?쒕룄紐?common.required.msg}")
	private String ctprvnNm       = "";

	/*
	 * ?쒓뎔援щ챸
	 */
	@NotEmpty(message = "?쒓뎔援щ챸{common.required.msg}")
    private String signguNm       = "";

    /*
     * ?띾㈃?숇챸
     */
    @NotEmpty(message = "?띾㈃?숇챸{common.required.msg}")
    private String emdNm          = "";

    /*
     * 由ш굔臾쇰챸
     */
    private String liBuldNm      = "";

    /*
     * ?꾨줈紐낆퐫??
     */
    private String rdmnCode       = "";

	/*
     * ?꾨줈紐?
     */
    private String rdmn       = "";

    /*
     * 嫄대Ъ踰덊샇蹂몃쾲
     */
    private String bdnbrMnnm          = "";

    /*
     * 嫄대Ъ踰덊샇遺踰?
     */
    private String bdnbrSlno      = "";

    /*
     * 嫄대Ъ紐?
     */
    private String buldNm      = "";

    /*
     * ?곸꽭嫄대Ъ紐?
     */
    private String detailBuldNm      = "";

    /*
     * 踰덉??숉샇
     */
    private String lnbrDongHo     = "";

	/*
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";

    /*
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId   = "";

	/**
	 * zip attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getZip() {
		return zip;
	}

	/**
	 * zip attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param zip String
	 */
	public void setZip(String zip) {
		this.zip = zip;
	}

	/**
	 * sn attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getSn() {
		return sn;
	}

	/**
	 * sn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sn int
	 */
	public void setSn(int sn) {
		this.sn = sn;
	}

	/**
	 * ctprvnNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCtprvnNm() {
		return ctprvnNm;
	}

	/**
	 * ctprvnNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ctprvnNm String
	 */
	public void setCtprvnNm(String ctprvnNm) {
		this.ctprvnNm = ctprvnNm;
	}

	/**
	 * signguNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSignguNm() {
		return signguNm;
	}

	/**
	 * signguNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param signguNm String
	 */
	public void setSignguNm(String signguNm) {
		this.signguNm = signguNm;
	}

	/**
	 * emdNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmdNm() {
		return emdNm;
	}

	/**
	 * emdNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emdNm String
	 */
	public void setEmdNm(String emdNm) {
		this.emdNm = emdNm;
	}

	/**
	 * liBuldNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLiBuldNm() {
		return liBuldNm;
	}

	/**
	 * liBuldNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param liBuldNm String
	 */
	public void setLiBuldNm(String liBuldNm) {
		this.liBuldNm = liBuldNm;
	}

	/**
	 * lnbrDongHo attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLnbrDongHo() {
		return lnbrDongHo;
	}

	/**
	 * lnbrDongHo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lnbrDongHo String
	 */
	public void setLnbrDongHo(String lnbrDongHo) {
		this.lnbrDongHo = lnbrDongHo;
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
