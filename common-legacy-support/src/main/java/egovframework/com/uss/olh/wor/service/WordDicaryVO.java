package egovframework.com.uss.olh.wor.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * ?????? VO ?????
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
public class WordDicaryVO extends WordDicaryDefaultVO {

	private static final long serialVersionUID = 1L;

	/** ??ID **/
	private String wordId;

	/** ???**/
	private String wordNm;

	/** ???**/
	private String engNm;

	/** ???? **/
	private String wordDc;

	/** ????**/
	private String synonm;

	/** ??? **/
	private String emplyrNm;

	/** ???? **/
	private String frstRegisterPnttm;

	/** ??? **/
	private String frstRegisterId;

	/** ???? **/
	private String lastUpdusrPnttm;

	/** ??? **/
	private String lastUpdusrId;

	/**
	 * wordId attribute ?????.
	 * @return the String
	 **/
	public String getWordId() {
		return wordId;
	}

	/**
	 * wordId attribute ???????.
	 * @return wordId String
	 **/
	public void setWordId(String wordId) {
		this.wordId = wordId;
	}

	/**
	 * wordNm attribute ?????.
	 * @return the String
	 **/
	public String getWordNm() {
		return wordNm;
	}

	/**
	 * wordNm attribute ???????.
	 * @return wordNm String
	 **/
	public void setWordNm(String wordNm) {
		this.wordNm = wordNm;
	}

	/**
	 * engNm attribute ?????.
	 * @return the String
	 **/
	public String getEngNm() {
		return engNm;
	}

	/**
	 * engNm attribute ???????.
	 * @return engNm String
	 **/
	public void setEngNm(String engNm) {
		this.engNm = engNm;
	}

	/**
	 * wordDc attribute ?????.
	 * @return the String
	 **/
	public String getWordDc() {
		return wordDc;
	}

	/**
	 * wordDc attribute ???????.
	 * @return wordDc String
	 **/
	public void setWordDc(String wordDc) {
		this.wordDc = wordDc;
	}

	/**
	 * synonm attribute ?????.
	 * @return the String
	 **/
	public String getSynonm() {
		return synonm;
	}

	/**
	 * synonm attribute ???????.
	 * @return synonm String
	 **/
	public void setSynonm(String synonm) {
		this.synonm = synonm;
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
