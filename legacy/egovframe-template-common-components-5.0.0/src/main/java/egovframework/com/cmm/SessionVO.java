package egovframework.com.cmm;

import java.io.Serializable;

/**
 * ?몄뀡 VO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *  
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 * 
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.06  諛뺤???         理쒖큹 ?앹꽦 
 *  
 *  </pre>
 */
@SuppressWarnings("serial")
public class SessionVO implements Serializable {
	
	/** ?꾩씠??*/
	private String sUserId;
	/** ?대쫫 */
	private String sUserNm;
	/** ?대찓??*/
	private String sEmail;
	/** ?ъ슜?먭뎄遺?*/
	private String sUserSe;
	/** 議곗쭅(遺??ID */
	private String orgnztId;
	/** 怨좎쑀?꾩씠??*/
	private String uniqId;
	/**
	 * sUserId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSUserId() {
		return sUserId;
	}
	/**
	 * sUserId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sUserId String
	 */
	public void setSUserId(String userId) {
		sUserId = userId;
	}
	/**
	 * sUserNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSUserNm() {
		return sUserNm;
	}
	/**
	 * sUserNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sUserNm String
	 */
	public void setSUserNm(String userNm) {
		sUserNm = userNm;
	}
	/**
	 * sEmail attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSEmail() {
		return sEmail;
	}
	/**
	 * sEmail attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sEmail String
	 */
	public void setSEmail(String email) {
		sEmail = email;
	}
	/**
	 * sUserSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSUserSe() {
		return sUserSe;
	}
	/**
	 * sUserSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sUserSe String
	 */
	public void setSUserSe(String userSe) {
		sUserSe = userSe;
	}
	/**
	 * orgnztId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOrgnztId() {
		return orgnztId;
	}
	/**
	 * orgnztId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param orgnztId String
	 */
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	/**
	 * uniqId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUniqId() {
		return uniqId;
	}
	/**
	 * uniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param uniqId String
	 */
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}
}
