package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 遺?쒖뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댄븿ID, 遺?쒖뾽臾퀹D, 遺?쒖뾽臾대챸, 遺?쒖뾽臾대궡?? ?낅Т?대떦?? ?곗꽑?쒖쐞, 泥⑤??뚯씪ID ????ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:04
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
public class Dept implements Serializable {
	/** 遺??ID */
	private String orgnztId;
	/** 遺?쒕챸 */
	private String orgnztNm;
	/** 遺?쒖꽕紐?*/
	private String orgnztDc;
	
	public String getOrgnztId() {
		return orgnztId;
	}
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	public String getOrgnztNm() {
		return orgnztNm;
	}
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	public String getOrgnztDc() {
		return orgnztDc;
	}
	public void setOrgnztDc(String orgnztDc) {
		this.orgnztDc = orgnztDc;
	}
}
