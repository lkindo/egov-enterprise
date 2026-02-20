package egovframework.com.uss.olh.faq.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * FAQ????? VO ?????
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
public class FaqVO extends FaqDefaultVO {

	private static final long serialVersionUID = 1L;

	/** FAQ ID **/
	private String faqId;

	/** ?? **/
	private String qestnSj;

	/** ?? **/
	private String qestnCn;

	/** ????? **/
	private String answerCn;

	/** ??? **/
	private String inqireCo;

	/** ????ID **/
	private String atchFileId;

	/** ???? **/
	private String frstRegisterPnttm;

	/** ??? **/
	private String frstRegisterId;

	/** ???? **/
	private String lastUpdusrPnttm;

	/** ??? **/
	private String lastUpdusrId;

	/**
	 * faqId attribute ?????.
	 * @return the String
	 **/
	public String getFaqId() {
		return faqId;
	}

	/**
	 * faqId attribute ???????.
	 * @return faqId String
	 **/
	public void setFaqId(String faqId) {
		this.faqId = faqId;
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
	 * atchFileId attribute ?????.
	 * @return the String
	 **/
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute ???????.
	 * @return atchFileId String
	 **/
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
