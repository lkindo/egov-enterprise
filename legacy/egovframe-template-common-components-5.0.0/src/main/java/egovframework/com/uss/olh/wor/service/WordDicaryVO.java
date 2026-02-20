package egovframework.com.uss.olh.wor.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * ?⑹뼱?ъ쟾?뺣낫 VO ?대옒??
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
public class WordDicaryVO extends WordDicaryDefaultVO {

	private static final long serialVersionUID = 1L;

	/** ?⑹뼱ID */
	private String wordId;

	/** ?⑹뼱紐?*/
	private String wordNm;

	/** ?곷Ц紐?*/
	private String engNm;

	/** ?⑹뼱?ㅻ챸 */
	private String wordDc;

	/** ?숈쓽??*/
	private String synonm;

	/** ?깅줉?먮챸 */
	private String emplyrNm;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId;

	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId;

	/**
	 * wordId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWordId() {
		return wordId;
	}

	/**
	 * wordId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return wordId String
	 */
	public void setWordId(String wordId) {
		this.wordId = wordId;
	}

	/**
	 * wordNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWordNm() {
		return wordNm;
	}

	/**
	 * wordNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return wordNm String
	 */
	public void setWordNm(String wordNm) {
		this.wordNm = wordNm;
	}

	/**
	 * engNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEngNm() {
		return engNm;
	}

	/**
	 * engNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return engNm String
	 */
	public void setEngNm(String engNm) {
		this.engNm = engNm;
	}

	/**
	 * wordDc attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getWordDc() {
		return wordDc;
	}

	/**
	 * wordDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return wordDc String
	 */
	public void setWordDc(String wordDc) {
		this.wordDc = wordDc;
	}

	/**
	 * synonm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSynonm() {
		return synonm;
	}

	/**
	 * synonm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return synonm String
	 */
	public void setSynonm(String synonm) {
		this.synonm = synonm;
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
