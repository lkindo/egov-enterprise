package egovframework.com.uss.olh.qna.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * Q&A????? VO ?????
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ??         ????
 *
 * </pre>
 **/
public class QnaVO extends QnaDefaultVO {

	private static final long serialVersionUID = 1L;

	/** QA ID **/
	private String qaId;

	/** ?? **/
	private String qestnSj;

	/** ?? **/
	private String qestnCn;

	/** ??????**/
	private String writngPassword;

	/** ????**/
	private String areaNo;

	/** ???**/
	private String middleTelno;

	/** ?????**/
	private String endTelno;

	/** ??????**/
	private String emailAdres;

	/** ?????????? **/
	private String emailAnswerAt;

	/** ????**/
	private String wrterNm;

	/** ??? **/
	private String writngDe;

	/** ??? **/
	private String inqireCo;

	/** ??????**/
	private String qnaProcessSttusCode;

	/** ??????**/
	private String qnaProcessSttusCodeNm;

	/** ????? **/
	private String answerCn;

	/** ????? **/
	private String answerDe;

	/** ?????????? **/
	private String passwordConfirmAt;

	/** ????? **/
	private String emplyrNm;

	/** ???????**/
	private String offmTelno;

	/** ?????EMAIL ??**/
	private String aemailAdres;

	/** ??? **/
	private String orgnztNm;

	/** ???? **/
	private String frstRegisterPnttm;

	/** ??? **/
	private String frstRegisterId;

	/** ???? **/
	private String lastUpdusrPnttm;

	/** ??? **/
	private String lastUpdusrId;

	/**
	 * qaId attribute ?????.
	 * @return the String
	 **/
	public String getQaId() {
		return qaId;
	}

	/**
	 * qaId attribute ???????.
	 * @return qaId String
	 **/
	public void setQaId(String qaId) {
		this.qaId = qaId;
	}

	/**
	 * qestnSj attribute ?????.
	 * @return the String
	 **/
	public String getQestnSj() {
		return qestnSj;
	}

	/**
	 * qestnSj attribute ???????.
	 * @return qestnSj String
	 **/
	public void setQestnSj(String qestnSj) {
		this.qestnSj = qestnSj;
	}

	/**
	 * qestnCn attribute ?????.
	 * @return the String
	 **/
	public String getQestnCn() {
		return qestnCn;
	}

	/**
	 * qestnCn attribute ???????.
	 * @return qestnCn String
	 **/
	public void setQestnCn(String qestnCn) {
		this.qestnCn = qestnCn;
	}

	/**
	 * writngPassword attribute ?????.
	 * @return the String
	 **/
	public String getWritngPassword() {
		return writngPassword;
	}

	/**
	 * writngPassword attribute ???????.
	 * @return writngPassword String
	 **/
	public void setWritngPassword(String writngPassword) {
		this.writngPassword = writngPassword;
	}

	/**
	 * areaNo attribute ?????.
	 * @return the String
	 **/
	public String getAreaNo() {
		return areaNo;
	}

	/**
	 * areaNo attribute ???????.
	 * @return areaNo String
	 **/
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}

	/**
	 * middleTelno attribute ?????.
	 * @return the String
	 **/
	public String getMiddleTelno() {
		return middleTelno;
	}

	/**
	 * middleTelno attribute ???????.
	 * @return middleTelno String
	 **/
	public void setMiddleTelno(String middleTelno) {
		this.middleTelno = middleTelno;
	}

	/**
	 * endTelno attribute ?????.
	 * @return the String
	 **/
	public String getEndTelno() {
		return endTelno;
	}

	/**
	 * endTelno attribute ???????.
	 * @return endTelno String
	 **/
	public void setEndTelno(String endTelno) {
		this.endTelno = endTelno;
	}

	/**
	 * emailAdres attribute ?????.
	 * @return the String
	 **/
	public String getEmailAdres() {
		return emailAdres;
	}

	/**
	 * emailAdres attribute ???????.
	 * @return emailAdres String
	 **/
	public void setEmailAdres(String emailAdres) {
		this.emailAdres = emailAdres;
	}

	/**
	 * emailAnswerAt attribute ?????.
	 * @return the String
	 **/
	public String getEmailAnswerAt() {
		return emailAnswerAt;
	}

	/**
	 * emailAnswerAt attribute ???????.
	 * @return emailAnswerAt String
	 **/
	public void setEmailAnswerAt(String emailAnswerAt) {
		this.emailAnswerAt = emailAnswerAt;
	}

	/**
	 * wrterNm attribute ?????.
	 * @return the String
	 **/
	public String getWrterNm() {
		return wrterNm;
	}

	/**
	 * wrterNm attribute ???????.
	 * @return wrterNm String
	 **/
	public void setWrterNm(String wrterNm) {
		this.wrterNm = wrterNm;
	}

	/**
	 * writngDe attribute ?????.
	 * @return the String
	 **/
	public String getWritngDe() {
		return writngDe;
	}

	/**
	 * writngDe attribute ???????.
	 * @return writngDe String
	 **/
	public void setWritngDe(String writngDe) {
		this.writngDe = writngDe;
	}

	/**
	 * inqireCo attribute ?????.
	 * @return the String
	 **/
	public String getInqireCo() {
		return inqireCo;
	}

	/**
	 * inqireCo attribute ???????.
	 * @return inqireCo String
	 **/
	public void setInqireCo(String inqireCo) {
		this.inqireCo = inqireCo;
	}

	/**
	 * qnaProcessSttusCode attribute ?????.
	 * @return the String
	 **/
	public String getQnaProcessSttusCode() {
		return qnaProcessSttusCode;
	}

	/**
	 * qnaProcessSttusCode attribute ???????.
	 * @return qnaProcessSttusCode String
	 **/
	public void setQnaProcessSttusCode(String qnaProcessSttusCode) {
		this.qnaProcessSttusCode = qnaProcessSttusCode;
	}

	/**
	 * qnaProcessSttusCodeNm attribute ?????.
	 * @return the String
	 **/
	public String getQnaProcessSttusCodeNm() {
		return qnaProcessSttusCodeNm;
	}

	/**
	 * qnaProcessSttusCodeNm attribute ???????.
	 * @return qnaProcessSttusCodeNm String
	 **/
	public void setQnaProcessSttusCodeNm(String qnaProcessSttusCodeNm) {
		this.qnaProcessSttusCodeNm = qnaProcessSttusCodeNm;
	}

	/**
	 * answerCn attribute ?????.
	 * @return the String
	 **/
	public String getAnswerCn() {
		return answerCn;
	}

	/**
	 * answerCn attribute ???????.
	 * @return answerCn String
	 **/
	public void setAnswerCn(String answerCn) {
		this.answerCn = answerCn;
	}

	/**
	 * answerDe attribute ?????.
	 * @return the String
	 **/
	public String getAnswerDe() {
		return answerDe;
	}

	/**
	 * answerDe attribute ???????.
	 * @return answerDe String
	 **/
	public void setAnswerDe(String answerDe) {
		this.answerDe = answerDe;
	}

	/**
	 * passwordConfirmAt attribute ?????.
	 * @return the String
	 **/
	public String getPasswordConfirmAt() {
		return passwordConfirmAt;
	}

	/**
	 * passwordConfirmAt attribute ???????.
	 * @return passwordConfirmAt String
	 **/
	public void setPasswordConfirmAt(String passwordConfirmAt) {
		this.passwordConfirmAt = passwordConfirmAt;
	}

	/**
	 * emplyrNm attribute ?????.
	 * @return the String
	 **/
	public String getEmplyrNm() {
		return emplyrNm;
	}

	/**
	 * emplyrNm attribute ???????.
	 * @return emplyrNm String
	 **/
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}

	/**
	 * offmTelno attribute ?????.
	 * @return the String
	 **/
	public String getOffmTelno() {
		return offmTelno;
	}

	/**
	 * offmTelno attribute ???????.
	 * @return offmTelno String
	 **/
	public void setOffmTelno(String offmTelno) {
		this.offmTelno = offmTelno;
	}

	/**
	 * aemailAdres attribute ?????.
	 * @return the String
	 **/
	public String getAemailAdres() {
		return aemailAdres;
	}

	/**
	 * aemailAdres attribute ???????.
	 * @return aemailAdres String
	 **/
	public void setAemailAdres(String aemailAdres) {
		this.aemailAdres = aemailAdres;
	}

	/**
	 * orgnztNm attribute ?????.
	 * @return the String
	 **/
	public String getOrgnztNm() {
		return orgnztNm;
	}

	/**
	 * orgnztNm attribute ???????.
	 * @return orgnztNm String
	 **/
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}

	/**
	 * frstRegisterPnttm attribute ?????.
	 * @return the String
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute ???????.
	 * @return frstRegisterPnttm String
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * @return the String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * @return frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute ?????.
	 * @return the String
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute ???????.
	 * @return lastUpdusrPnttm String
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * @return the String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * @return lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * toString ???? ????
	 **/
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}
}
