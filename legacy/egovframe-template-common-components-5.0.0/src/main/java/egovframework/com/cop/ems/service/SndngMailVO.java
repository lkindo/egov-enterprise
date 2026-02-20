package egovframework.com.cop.ems.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛쒖넚硫붿씪 VO ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *  2011.12.06  ?닿린??         泥⑤??뚯씪寃쎈줈(fileStreCours), 泥⑤??뚯씪?대쫫(orignlFileNm) 異붽?
 *
 *      </pre>
 */
public class SndngMailVO extends ComDefaultVO {

	/** 硫붿꽭吏ID */
	private String mssageId;
	/** 諛쒖떊??*/
	private String dsptchPerson;
	/** ?섏떊??*/
	private String recptnPerson;
	/** ?쒕ぉ */
	private String sj;
	/** 諛쒖넚寃곌낵肄붾뱶 */
	private String sndngResultCode;
	/** 硫붿씪?댁슜 */
	private String emailCn;
	/** 泥⑤??뚯씪ID */
	private String atchFileId;
	/** 泥⑤??뚯씪寃쎈줈 */
	private String fileStreCours;
	/** 泥⑤??뚯씪?대쫫 */
	private String orignlFileNm;
	/** 諛쒖떊?쇱옄 */
	private String sndngDe;
	/** 泥⑤??뚯씪ID 由ъ뒪??*/
	private String atchFileIdList;
	/** 諛쒖넚?붿껌XML?댁슜 */
	private String xmlContent;
	/** ?앹뾽留곹겕?щ?(Y/N) */
	private String link;

	/**
	 * mssageId attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getMssageId() {
		return mssageId;
	}

	/**
	 * mssageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param mssageId String
	 */
	public void setMssageId(String mssageId) {
		this.mssageId = mssageId;
	}

	/**
	 * dsptchPerson attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getDsptchPerson() {
		return dsptchPerson;
	}

	/**
	 * dsptchPerson attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param dsptchPerson String
	 */
	public void setDsptchPerson(String dsptchPerson) {
		this.dsptchPerson = dsptchPerson;
	}

	/**
	 * recptnPerson attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getRecptnPerson() {
		return recptnPerson;
	}

	/**
	 * recptnPerson attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param recptnPerson String
	 */
	public void setRecptnPerson(String recptnPerson) {
		this.recptnPerson = recptnPerson;
	}

	/**
	 * sj attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSj() {
		return sj;
	}

	/**
	 * sj attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param sj String
	 */
	public void setSj(String sj) {
		this.sj = sj;
	}

	/**
	 * sndngResultCode attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSndngResultCode() {
		return sndngResultCode;
	}

	/**
	 * sndngResultCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param sndngResultCode String
	 */
	public void setSndngResultCode(String sndngResultCode) {
		this.sndngResultCode = sndngResultCode;
	}

	/**
	 * emailCn attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getEmailCn() {
		return emailCn;
	}

	/**
	 * emailCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param emailCn String
	 */
	public void setEmailCn(String emailCn) {
		this.emailCn = emailCn;
	}

	/**
	 * atchFileId attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param atchFileId String
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	public String getFileStreCours() {
		return fileStreCours;
	}

	public void setFileStreCours(String fileStreCours) {
		this.fileStreCours = fileStreCours;
	}

	public String getOrignlFileNm() {
		return orignlFileNm;
	}

	public void setOrignlFileNm(String orignlFileNm) {
		this.orignlFileNm = orignlFileNm;
	}

	/**
	 * sndngDe attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSndngDe() {
		return sndngDe;
	}

	/**
	 * sndngDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param sndngDe String
	 */
	public void setSndngDe(String sndngDe) {
		this.sndngDe = sndngDe;
	}

	/**
	 * atchFileIdList attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAtchFileIdList() {
		return atchFileIdList;
	}

	/**
	 * atchFileIdList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param atchFileIdList String
	 */
	public void setAtchFileIdList(String atchFileIdList) {
		this.atchFileIdList = atchFileIdList;
	}

	/**
	 * xmlContent attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getXmlContent() {
		return xmlContent;
	}

	/**
	 * xmlContent attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param xmlContent String
	 */
	public void setXmlContent(String xmlContent) {
		this.xmlContent = xmlContent;
	}

	/**
	 * link attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getLink() {
		return link;
	}

	/**
	 * link attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param link String
	 */
	public void setLink(String link) {
		this.link = link;
	}
}
