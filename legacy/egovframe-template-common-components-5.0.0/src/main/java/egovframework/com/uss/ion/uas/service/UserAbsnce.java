/**
 * 媛쒖슂
 * - ?ъ슜?먮??ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ъ슜?먮??ъ쓽 ?ъ슜?륤D, ?ъ슜?먮??ъ뿬遺 ??ぉ??愿由ы븳??
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:09:34
 */

package egovframework.com.uss.ion.uas.service;

import egovframework.com.cmm.ComDefaultVO;

public class UserAbsnce extends ComDefaultVO {
	
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?ъ슜?륤D
	 */
	private String userId;
	/**
	 * ?ъ슜?먮챸
	 */
	private String userNm;	
	/**
	 * ?ъ슜?먮??ъ뿬遺
	 */
	private String userAbsnceAt;
	/**
	 * 理쒖쥌?깅줉?륤D
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?깅줉?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * ?깅줉?щ?
	 */
	private String regYn;	

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
	 * @return the userNm
	 */
	public String getUserNm() {
		return userNm;
	}
	/**
	 * @param userNm the userNm to set
	 */
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * @return the userAbsnceAt
	 */
	public String getUserAbsnceAt() {
		return userAbsnceAt;
	}
	/**
	 * @param userAbsnceAt the userAbsnceAt to set
	 */
	public void setUserAbsnceAt(String userAbsnceAt) {
		this.userAbsnceAt = userAbsnceAt;
	}
	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * @return the regYn
	 */
	public String getRegYn() {
		return regYn;
	}
	/**
	 * @param regYn the regYn to set
	 */
	public void setRegYn(String regYn) {
		this.regYn = regYn;
	}
}
