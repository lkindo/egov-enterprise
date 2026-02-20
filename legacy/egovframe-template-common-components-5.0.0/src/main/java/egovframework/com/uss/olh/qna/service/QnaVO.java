package egovframework.com.uss.olh.qna.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * Q&A瑜?泥섎━?섎뒗 VO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class QnaVO extends QnaDefaultVO {

	private static final long serialVersionUID = 1L;

	/** QA ID */
	private String qaId;

	/** 吏덈Ц?쒕ぉ */
	private String qestnSj;

	/** 吏덈Ц?댁슜 */
	private String qestnCn;

	/** ?묒꽦鍮꾨?踰덊샇 */
	private String writngPassword;

	/** 吏??쾲??*/
	private String areaNo;

	/** 以묎컙?꾪솕踰덊샇 */
	private String middleTelno;

	/** ?앹쟾?붾쾲??*/
	private String endTelno;

	/** ?대찓??二쇱냼 */
	private String emailAdres;

	/** ?대찓???듬??щ? */
	private String emailAnswerAt;

	/** ?묒꽦??紐?*/
	private String wrterNm;

	/** ?묒꽦?쇱옄 */
	private String writngDe;

	/** 議고쉶?잛닔 */
	private String inqireCo;

	/** 吏덉쓽?묐떟泥섎━?곹깭肄붾뱶 */
	private String qnaProcessSttusCode;

	/** 吏덉쓽?묐떟泥섎━?곹깭肄붾뱶紐?*/
	private String qnaProcessSttusCodeNm;

	/** ?듬??댁슜 */
	private String answerCn;

	/** ?듬??쇱옄 */
	private String answerDe;

	/** ?묒꽦鍮꾨?踰덊샇 ?뺤씤?щ? */
	private String passwordConfirmAt;

	/** ?듬??먮챸 */
	private String emplyrNm;

	/** ?щТ?ㅼ쟾?붾쾲??*/
	private String offmTelno;

	/** ?듬???EMAIL 二쇱냼 */
	private String aemailAdres;

	/** 遺?쒕챸 */
	private String orgnztNm;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId;

	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId;

	/**
	 * qaId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQaId() {
		return qaId;
	}

	/**
	 * qaId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qaId String
	 */
	public void setQaId(String qaId) {
		this.qaId = qaId;
	}

	/**
	 * qestnSj attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnSj() {
		return qestnSj;
	}

	/**
	 * qestnSj attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnSj String
	 */
	public void setQestnSj(String qestnSj) {
		this.qestnSj = qestnSj;
	}

	/**
	 * qestnCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnCn() {
		return qestnCn;
	}

	/**
	 * qestnCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnCn String
	 */
	public void setQestnCn(String qestnCn) {
		this.qestnCn = qestnCn;
	}

	/**
	 * writngPassword attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWritngPassword() {
		return writngPassword;
	}

	/**
	 * writngPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return writngPassword String
	 */
	public void setWritngPassword(String writngPassword) {
		this.writngPassword = writngPassword;
	}

	/**
	 * areaNo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAreaNo() {
		return areaNo;
	}

	/**
	 * areaNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return areaNo String
	 */
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}

	/**
	 * middleTelno attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMiddleTelno() {
		return middleTelno;
	}

	/**
	 * middleTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return middleTelno String
	 */
	public void setMiddleTelno(String middleTelno) {
		this.middleTelno = middleTelno;
	}

	/**
	 * endTelno attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEndTelno() {
		return endTelno;
	}

	/**
	 * endTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return endTelno String
	 */
	public void setEndTelno(String endTelno) {
		this.endTelno = endTelno;
	}

	/**
	 * emailAdres attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEmailAdres() {
		return emailAdres;
	}

	/**
	 * emailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return emailAdres String
	 */
	public void setEmailAdres(String emailAdres) {
		this.emailAdres = emailAdres;
	}

	/**
	 * emailAnswerAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEmailAnswerAt() {
		return emailAnswerAt;
	}

	/**
	 * emailAnswerAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return emailAnswerAt String
	 */
	public void setEmailAnswerAt(String emailAnswerAt) {
		this.emailAnswerAt = emailAnswerAt;
	}

	/**
	 * wrterNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWrterNm() {
		return wrterNm;
	}

	/**
	 * wrterNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return wrterNm String
	 */
	public void setWrterNm(String wrterNm) {
		this.wrterNm = wrterNm;
	}

	/**
	 * writngDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWritngDe() {
		return writngDe;
	}

	/**
	 * writngDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return writngDe String
	 */
	public void setWritngDe(String writngDe) {
		this.writngDe = writngDe;
	}

	/**
	 * inqireCo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getInqireCo() {
		return inqireCo;
	}

	/**
	 * inqireCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return inqireCo String
	 */
	public void setInqireCo(String inqireCo) {
		this.inqireCo = inqireCo;
	}

	/**
	 * qnaProcessSttusCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQnaProcessSttusCode() {
		return qnaProcessSttusCode;
	}

	/**
	 * qnaProcessSttusCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qnaProcessSttusCode String
	 */
	public void setQnaProcessSttusCode(String qnaProcessSttusCode) {
		this.qnaProcessSttusCode = qnaProcessSttusCode;
	}

	/**
	 * qnaProcessSttusCodeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQnaProcessSttusCodeNm() {
		return qnaProcessSttusCodeNm;
	}

	/**
	 * qnaProcessSttusCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qnaProcessSttusCodeNm String
	 */
	public void setQnaProcessSttusCodeNm(String qnaProcessSttusCodeNm) {
		this.qnaProcessSttusCodeNm = qnaProcessSttusCodeNm;
	}

	/**
	 * answerCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAnswerCn() {
		return answerCn;
	}

	/**
	 * answerCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return answerCn String
	 */
	public void setAnswerCn(String answerCn) {
		this.answerCn = answerCn;
	}

	/**
	 * answerDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAnswerDe() {
		return answerDe;
	}

	/**
	 * answerDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return answerDe String
	 */
	public void setAnswerDe(String answerDe) {
		this.answerDe = answerDe;
	}

	/**
	 * passwordConfirmAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getPasswordConfirmAt() {
		return passwordConfirmAt;
	}

	/**
	 * passwordConfirmAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return passwordConfirmAt String
	 */
	public void setPasswordConfirmAt(String passwordConfirmAt) {
		this.passwordConfirmAt = passwordConfirmAt;
	}

	/**
	 * emplyrNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEmplyrNm() {
		return emplyrNm;
	}

	/**
	 * emplyrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return emplyrNm String
	 */
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}

	/**
	 * offmTelno attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getOffmTelno() {
		return offmTelno;
	}

	/**
	 * offmTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return offmTelno String
	 */
	public void setOffmTelno(String offmTelno) {
		this.offmTelno = offmTelno;
	}

	/**
	 * aemailAdres attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAemailAdres() {
		return aemailAdres;
	}

	/**
	 * aemailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return aemailAdres String
	 */
	public void setAemailAdres(String aemailAdres) {
		this.aemailAdres = aemailAdres;
	}

	/**
	 * orgnztNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getOrgnztNm() {
		return orgnztNm;
	}

	/**
	 * orgnztNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return orgnztNm String
	 */
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * toString 硫붿냼?쒕? ?移섑븳??
	 */
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}
}
