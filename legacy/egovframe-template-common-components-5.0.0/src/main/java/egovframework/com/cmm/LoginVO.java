package egovframework.com.cmm;

import java.io.Serializable;

/**
 * @Class Name : LoginVO.java
 * @Description : Login VO class
 * @Modification Information
 *
 *<pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??             ?섏젙??         ?섏젙?댁슜
 *   ----------  --------  ---------------------------
 *   2009.03.03     諛뺤???    理쒖큹 ?앹꽦
 *   2021.05.30     ?뺤쭊??    ?붿??몄썝?⑥뒪 ?ъ슜?먰궎/?몄뀡媛?異붽?
 *</pre>
 *
 *  @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 *  @since 2009.03.03
 *  @version 1.0
 *  @see
 *  
 */
public class LoginVO implements Serializable{
	
	/**
	 * 
	 */
	private static final long serialVersionUID = -8274004534207618049L;
	
	/** ?꾩씠??*/
	private String id;
	/** ?대쫫 */
	private String name;
	/** 二쇰??깅줉踰덊샇 */
	private String ihidNum;
	/** ?대찓?쇱＜??*/
	private String email;
	/** 鍮꾨?踰덊샇 */
	private String password;
	/** 鍮꾨?踰덊샇 ?뚰듃 */
	private String passwordHint;
	/** 鍮꾨?踰덊샇 ?뺣떟 */
	private String passwordCnsr;
	/** ?ъ슜?먭뎄遺?*/
	private String userSe;
	/** 議곗쭅(遺??ID */
	private String orgnztId;
	/** 議곗쭅(遺??紐?*/
	private String orgnztNm;
	/** 怨좎쑀?꾩씠??*/
	private String uniqId;
	/** 濡쒓렇?????대룞???섏씠吏 */
	private String url;
	/** ?ъ슜??IP?뺣낫 */
	private String ip;
	/** GPKI?몄쬆 DN */
	private String dn;
	/** ?붿??몄썝?⑥뒪 ?ъ슜?먰궎 */
	private String onepassUserkey;
	/** ?붿??몄썝?⑥뒪 ?ъ슜?먯꽭?섍컪 */
	private String onepassIntfToken;

	/**
	 * id attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getId() {
		return id;
	}
	/**
	 * id attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param id String
	 */
	public void setId(String id) {
		this.id = id;
	}
	/**
	 * name attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getName() {
		return name;
	}
	/**
	 * name attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param name String
	 */
	public void setName(String name) {
		this.name = name;
	}
	/**
	 * ihidNum attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getIhidNum() {
		return ihidNum;
	}
	/**
	 * ihidNum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ihidNum String
	 */
	public void setIhidNum(String ihidNum) {
		this.ihidNum = ihidNum;
	}
	/**
	 * email attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmail() {
		return email;
	}
	/**
	 * email attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param email String
	 */
	public void setEmail(String email) {
		this.email = email;
	}
	/**
	 * password attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPassword() {
		return password;
	}
	/**
	 * password attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param password String
	 */
	public void setPassword(String password) {
		this.password = password;
	}
	/**
	 * passwordHint attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPasswordHint() {
		return passwordHint;
	}
	/**
	 * passwordHint attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param passwordHint String
	 */
	public void setPasswordHint(String passwordHint) {
		this.passwordHint = passwordHint;
	}
	/**
	 * passwordCnsr attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPasswordCnsr() {
		return passwordCnsr;
	}
	/**
	 * passwordCnsr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param passwordCnsr String
	 */
	public void setPasswordCnsr(String passwordCnsr) {
		this.passwordCnsr = passwordCnsr;
	}
	/**
	 * userSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUserSe() {
		return userSe;
	}
	/**
	 * userSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param userSe String
	 */
	public void setUserSe(String userSe) {
		this.userSe = userSe;
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
	/**
	 * url attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUrl() {
		return url;
	}
	/**
	 * url attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param url String
	 */
	public void setUrl(String url) {
		this.url = url;
	}
	/**
	 * ip attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getIp() {
		return ip;
	}
	/**
	 * ip attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ip String
	 */
	public void setIp(String ip) {
		this.ip = ip;
	}
	/**
	 * dn attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDn() {
		return dn;
	}
	/**
	 * dn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param dn String
	 */
	public void setDn(String dn) {
		this.dn = dn;
	}
	/**
	 * @return the orgnztNm
	 */
	public String getOrgnztNm() {
		return orgnztNm;
	}
	/**
	 * @param orgnztNm the orgnztNm to set
	 */
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	
	/**
	 * ?붿??몄썝?⑥뒪 ?ъ슜?먰궎瑜?由ы꽩?쒕떎.
	 * @return onepassUserkey
	 */
	public String getOnepassUserkey() {
		return onepassUserkey;
	}
	/**
	 * ?붿??몄썝?⑥뒪 ?ъ슜?먰궎瑜??ㅼ젙?쒕떎.
	 * @param onepassUserkey
	 */
	public void setOnepassUserkey(String onepassUserkey) {
		this.onepassUserkey = onepassUserkey;
	}
	/**
	 * ?붿??몄썝?⑥뒪 ?ъ슜?먯꽭?섍컪??由ы꽩?쒕떎.
	 * @return
	 */
	public String getOnepassIntfToken() {
		return onepassIntfToken;
	}
	/**
	 * ?붿??몄썝?⑥뒪 ?ъ슜?먯꽭?섍컪???ㅼ젙?쒕떎.
	 * @param onepassIntfToken
	 */
	public void setOnepassIntfToken(String onepassIntfToken) {
		this.onepassIntfToken = onepassIntfToken;
	}

}
