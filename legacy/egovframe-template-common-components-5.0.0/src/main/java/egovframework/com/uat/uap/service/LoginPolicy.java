**
 * 媛쒖슂
 * - 濡쒓렇?몄젙梨낆뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 濡쒓렇?몄젙梨낆젙蹂댁쓽 ?ъ슜?륤D, IP?뺣낫, 以묐났?덉슜?щ?, ?쒗븳?щ? ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:53
 *   <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 * 
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2009.8.3    ?대Ц以     理쒖큹 ?앹꽦
 *  2024.10.29	LeeBaekHaeng	?쒗걧?댁퐫???쇰젴踰덊샇 PK ?뚮씪誘명꽣 ?붾났?명솕
 * </pre>
 */

package egovframework.com.uat.uap.service;

import egovframework.com.cmm.ComDefaultVO;

public class LoginPolicy extends ComDefaultVO {

    /**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
    /**
	 * ?ъ슜??ID
	 */	
	private String emplyrId;
	/**
	 * ?ъ슜??ID ?뷀샇??
	 */
	private String emplyrIdEncrypt;
	/**
	 * ?ъ슜??紐?
	 */	
	private String emplyrNm;	
    /**
	 * ?ъ슜??援щ텇
	 */	
	private String emplyrSe;		
    /**
	 * IP?뺣낫
	 */	
    private String ipInfo;
    /**
	 * 以묐났?덉슜?щ?
	 */	
    private String dplctPermAt;
    /**
	 * ?쒗븳?щ?
	 */	
    private String lmttAt;
    /**
	 * ?깅줉??ID
	 */	
    private String userId;
    /**
	 * ?깅줉?쇱떆
	 */	
    private String regDate;
    /**
	 * ?깅줉?щ?
	 */	
    private String regYn;
    
	/**
	 * @return the emplyrId
	 */
	public String getEmplyrId() {
		return emplyrId;
	}
	/**
	 * @param emplyrId the emplyrId to set
	 */
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}

	public String getEmplyrIdEncrypt() {
		return emplyrIdEncrypt;
	}

	public void setEmplyrIdEncrypt(String emplyrIdEncrypt) {
		this.emplyrIdEncrypt = emplyrIdEncrypt;
	}

	/**
	 * @return the emplyrNm
	 */
	public String getEmplyrNm() {
		return emplyrNm;
	}
	/**
	 * @param emplyrNm the emplyrNm to set
	 */
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}
	/**
	 * @return the emplyrSe
	 */
	public String getEmplyrSe() {
		return emplyrSe;
	}
	/**
	 * @param emplyrSe the emplyrSe to set
	 */
	public void setEmplyrSe(String emplyrSe) {
		this.emplyrSe = emplyrSe;
	}
	/**
	 * @return the ipInfo
	 */
	public String getIpInfo() {
		return ipInfo;
	}
	/**
	 * @param ipInfo the ipInfo to set
	 */
	public void setIpInfo(String ipInfo) {
		this.ipInfo = ipInfo;
	}
	/**
	 * @return the dplctPermAt
	 */
	public String getDplctPermAt() {
		return dplctPermAt;
	}
	/**
	 * @param dplctPermAt the dplctPermAt to set
	 */
	public void setDplctPermAt(String dplctPermAt) {
		this.dplctPermAt = dplctPermAt;
	}
	/**
	 * @return the lmttAt
	 */
	public String getLmttAt() {
		return lmttAt;
	}
	/**
	 * @param lmttAt the lmttAt to set
	 */
	public void setLmttAt(String lmttAt) {
		this.lmttAt = lmttAt;
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
