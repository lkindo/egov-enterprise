package egovframework.com.uss.mpe.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂 - 留덉씠?섏씠吏?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜 - 留덉씠?섏씠吏??而⑦뀗痢좎븘?대뵒, 而⑦뀗痢?紐? 而⑦뀗痢?URL, 而⑦뀗痢??ъ슜 ?щ? ??ぉ??愿由ы븳??
 * 
 * @author ?댁갹??
 * @version 1.0
 * @created 05-8-2009 ?ㅽ썑 2:20:27
 */
public class IndvdlPgeVO extends ComDefaultVO {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 而⑦뀗痢??꾩씠??
	 */
	private String cntntsId;
	/**
	 * 而⑦뀗痢?紐?
	 */
	private String cntntsNm;
	/**
	 * 而⑦뀗痢?誘몃━蹂닿린 URL
	 */
	private String cntntsLinkUrl;
	/**
	 * 而⑦뀗痢?URL
	 */
	private String cntcUrl;
	/**
	 * 而⑦뀗痢??ㅻ챸
	 */
	private String cntntsDc;
	/**
	 * 而⑦뀗痢??ъ슜 ?щ?
	 */
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