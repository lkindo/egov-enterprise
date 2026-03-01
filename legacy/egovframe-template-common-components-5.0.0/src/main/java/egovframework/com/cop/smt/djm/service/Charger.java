package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?대떦?먯뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 議곗쭅紐? 吏곸쐞紐? ?ъ슜?먮챸, ?ъ슜?륤D ????ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:26
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Charger implements Serializable  {

	/** 議곗쭅紐?*/
	private String orgnztNm;
	/** 吏곸쐞紐?*/
	private String ofcpsNm;
	/** ?ъ슜?먮챸 */
	private String emplyrNm;
	/** ?ъ슜?륤D */
	private String uniqId;
	/** ?ъ썝踰덊샇 */
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
