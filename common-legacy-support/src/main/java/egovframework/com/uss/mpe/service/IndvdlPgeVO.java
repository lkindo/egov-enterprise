package egovframework.com.uss.mpe.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??- ?????????model ?????? ???.
 * 
 * ??? - ?????????? ???? ???URL, ?????????? ?????????
 * 
 * @author ????
 * @version 1.0
 * @created 05-8-2009 ?? 2:20:27
 **/
public class IndvdlPgeVO extends ComDefaultVO {
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;

	/**
	 * ??????
	 **/
	private String cntntsId;
	/**
	 * ????
	 **/
	private String cntntsNm;
	/**
	 * ????? URL
	 **/
	private String cntntsLinkUrl;
	/**
	 * ???URL
	 **/
	private String cntcUrl;
	/**
	 * ?????
	 **/
	private String cntntsDc;
	/**
	 * ??????????
	 **/
	private String cntntsUseAt;

	public String getCntntsId() {
		return cntntsId;
	}

	public void setCntntsId(String cntntsId) {
		this.cntntsId = cntntsId;
	}

	public String getCntntsNm() {
		return cntntsNm;
	}

	public void setCntntsNm(String cntntsNm) {
		this.cntntsNm = cntntsNm;
	}

	public String getCntntsLinkUrl() {
		return cntntsLinkUrl;
	}

	public void setCntntsLinkUrl(String cntntsLinkUrl) {
		this.cntntsLinkUrl = cntntsLinkUrl;
	}

	public String getCntcUrl() {
		return cntcUrl;
	}

	public void setCntcUrl(String cntcUrl) {
		this.cntcUrl = cntcUrl;
	}

	public String getCntntsDc() {
		return cntntsDc;
	}

	public void setCntntsDc(String cntntsDc) {
		this.cntntsDc = cntntsDc;
	}

	public String getCntntsUseAt() {
		return cntntsUseAt;
	}

	public void setCntntsUseAt(String cntntsUseAt) {
		this.cntntsUseAt = cntntsUseAt;
	}
}
