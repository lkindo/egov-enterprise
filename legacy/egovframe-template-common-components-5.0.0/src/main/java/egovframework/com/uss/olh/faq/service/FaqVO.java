package egovframework.com.uss.olh.faq.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * FAQ瑜?泥섎━?섎뒗 VO ?대옒??
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
public class FaqVO extends FaqDefaultVO {

	private static final long serialVersionUID = 1L;

	/** FAQ ID */
	private String faqId;

	/** 吏덈Ц?쒕ぉ */
	private String qestnSj;

	/** 吏덈Ц?댁슜 */
	private String qestnCn;

	/** ?듬??댁슜 */
	private String answerCn;

	/** 議고쉶?잛닔 */
	private String inqireCo;

	/** 泥⑤??뚯씪ID */
	private String atchFileId;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId;

	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId;

	/**
	 * faqId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFaqId() {
		return faqId;
	}

	/**
	 * faqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return faqId String
	 */
	public void setFaqId(String faqId) {
		this.faqId = faqId;
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
	 * atchFileId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return atchFileId String
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
