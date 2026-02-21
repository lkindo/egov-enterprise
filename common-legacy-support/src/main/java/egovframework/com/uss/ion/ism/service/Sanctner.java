package egovframework.com.uss.ion.ism.service;

import java.io.Serializable;

/**
 * ??
 * - ??? ????model ?????? ???.
 * 
 * ???
 * - ? ?? ?????, ???? ???????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:29:26
 **/
public class Sanctner implements Serializable {

	private static final long serialVersionUID = 1L;

	/**
	 * ?
	 **/
	private String orgnztNm;
	/**
	 * ??
	 **/
	private String ofcpsNm;
	/**
	 * ?????
	 **/
	private String emplyrNm;
	/**
	 * ????
	 **/
	private String uniqId;
	/**
	 * ????
	 **/
	private String emplNo;

	public String getOrgnztNm() {
		return orgnztNm;
	}

	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}

	public String getOfcpsNm() {
		return ofcpsNm;
	}

	public void setOfcpsNm(String ofcpsNm) {
		this.ofcpsNm = ofcpsNm;
	}

	public String getEmplyrNm() {
		return emplyrNm;
	}

	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}

	public String getUniqId() {
		return uniqId;
	}

	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}

	public String getEmplNo() {
		return emplNo;
	}

	public void setEmplNo(String emplNo) {
		this.emplNo = emplNo;
	}

}
