**
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡???쇰젴踰덊샇, ?명꽣?룹꽌鍮꾩뒪紐? ?명꽣?룹꽌鍮꾩뒪?ㅻ챸, 諛섏쁺?щ? ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:51
 */

package egovframework.com.uss.ion.isg.service;

import egovframework.com.cmm.ComDefaultVO;

public class IntnetSvcGuidance extends ComDefaultVO {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?명꽣?룹꽌鍮꾩뒪ID
	 */	
	private String intnetSvcId;
	/**
	 * ?명꽣?룹꽌鍮꾩뒪紐?
	 */		
	private String intnetSvcNm;
	/**
	 * ?명꽣?룹꽌鍮꾩뒪?ㅻ챸
	 */	
	private String intnetSvcDc;
	/**
	 * 諛섏쁺?щ?
	 */		
	private String reflctAt;
	/**
	 * ?ъ슜??ID
	 */
	private String userId;
	/**
	 * ?깅줉?쇱옄
	 */
	private String regDate;
	
	/**
	 * @return the intnetSvcId
	 */
	public String getIntnetSvcId() {
		return intnetSvcId;
	}
	/**
	 * @param intnetSvcId the intnetSvcId to set
	 */
	public void setIntnetSvcId(String intnetSvcId) {
		this.intnetSvcId = intnetSvcId;
	}
	/**
	 * @return the intnetSvcNm
	 */
	public String getIntnetSvcNm() {
		return intnetSvcNm;
	}
	/**
	 * @param intnetSvcNm the intnetSvcNm to set
	 */
	public void setIntnetSvcNm(String intnetSvcNm) {
		this.intnetSvcNm = intnetSvcNm;
	}
	/**
	 * @return the intnetSvcDc
	 */
	public String getIntnetSvcDc() {
		return intnetSvcDc;
	}
	/**
	 * @param intnetSvcDc the intnetSvcDc to set
	 */
	public void setIntnetSvcDc(String intnetSvcDc) {
		this.intnetSvcDc = intnetSvcDc;
	}
	/**
	 * @return the reflctAt
	 */
	public String getReflctAt() {
		return reflctAt;
	}
	/**
	 * @param reflctAt the reflctAt to set
	 */
	public void setReflctAt(String reflctAt) {
		this.reflctAt = reflctAt;
	}
	/**
	 * @return the userId
	 */
	public String getUserId() {
		return userId;
	}
	/**
	 * @param userId the userId to set
	 */
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * @return the regDate
	 */
	public String getRegDate() {
		return regDate;
	}
	/**
	 * @param regDate the regDate to set
	 */
	public void setRegDate(String regDate) {
		this.regDate = regDate;
	}
	
}
