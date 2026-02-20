package egovframework.com.cmm;

import java.io.Serializable;

/**
 * @Class Name : LoginVO.java
 * @Description : Login VO class
 * @Modification Information
 *
 *<pre>
 * << ?????Modification Information) >>
 *
 *   ????             ????         ????
 *   ----------  --------  ---------------------------
 *   2009.03.03     ???    ????
 *   2021.05.30     ???    ????? ???? ?              ??      ?   
 *</pre>
 *
 *  @author ?      ???      ??            ??          ???
 *  @since 2009.03.03
 *  @version 1.0
 *  @see
 *  
 */
public class LoginVO implements Serializable{
	
	/**
	 * 
	 **/
	private static final long serialVersionUID = -8274004534207618049L;
	
	/** ???**/
	private String id;
	/** ???**/
	private String name;
	/** ????**/
	private String ihidNum;
	/** ??????**/
	private String email;
	/** ?????**/
	private String password;
	/** ??????? **/
	private String passwordHint;
	/** ?????? **/
	private String passwordCnsr;
	/** ???????**/
	private String userSe;
	/** ????ID **/
	private String orgnztId;
	/** ?????**/
	private String orgnztNm;
	/** ?????**/
	private String uniqId;
	/** ??????????? **/
	private String url;
	/** ?????IP? **/
	private String ip;
	/** GPKI? DN **/
	private String dn;
	/** ????? ???? **/
	private String onepassUserkey;
	/** ????? ??????? **/
	private String onepassIntfToken;

	/**
	 * id attribute ?????.
	 * @return String
	 **/
	public String getId() {
		return id;
	}
	/**
	 * id attribute ???????.
	 * @param id String
	 **/
	public void setId(String id) {
		this.id = id;
	}
	/**
	 * name attribute ?????.
	 * @return String
	 **/
	public String getName() {
		return name;
	}
	/**
	 * name attribute ???????.
	 * @param name String
	 **/
	public void setName(String name) {
		this.name = name;
	}
	/**
	 * ihidNum attribute ?????.
	 * @return String
	 **/
	public String getIhidNum() {
		return ihidNum;
	}
	/**
	 * ihidNum attribute ???????.
	 * @param ihidNum String
	 **/
	public void setIhidNum(String ihidNum) {
		this.ihidNum = ihidNum;
	}
	/**
	 * email attribute ?????.
	 * @return String
	 **/
	public String getEmail() {
		return email;
	}
	/**
	 * email attribute ???????.
	 * @param email String
	 **/
	public void setEmail(String email) {
		this.email = email;
	}
	/**
	 * password attribute ?????.
	 * @return String
	 **/
	public String getPassword() {
		return password;
	}
	/**
	 * password attribute ???????.
	 * @param password String
	 **/
	public void setPassword(String password) {
		this.password = password;
	}
	/**
	 * passwordHint attribute ?????.
	 * @return String
	 **/
	public String getPasswordHint() {
		return passwordHint;
	}
	/**
	 * passwordHint attribute ???????.
	 * @param passwordHint String
	 **/
	public void setPasswordHint(String passwordHint) {
		this.passwordHint = passwordHint;
	}
	/**
	 * passwordCnsr attribute ?????.
	 * @return String
	 **/
	public String getPasswordCnsr() {
		return passwordCnsr;
	}
	/**
	 * passwordCnsr attribute ???????.
	 * @param passwordCnsr String
	 **/
	public void setPasswordCnsr(String passwordCnsr) {
		this.passwordCnsr = passwordCnsr;
	}
	/**
	 * userSe attribute ?????.
	 * @return String
	 **/
	public String getUserSe() {
		return userSe;
	}
	/**
	 * userSe attribute ???????.
	 * @param userSe String
	 **/
	public void setUserSe(String userSe) {
		this.userSe = userSe;
	}
	/**
	 * orgnztId attribute ?????.
	 * @return String
	 **/
	public String getOrgnztId() {
		return orgnztId;
	}
	/**
	 * orgnztId attribute ???????.
	 * @param orgnztId String
	 **/
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	/**
	 * uniqId attribute ?????.
	 * @return String
	 **/
	public String getUniqId() {
		return uniqId;
	}
	/**
	 * uniqId attribute ???????.
	 * @param uniqId String
	 **/
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}
	/**
	 * url attribute ?????.
	 * @return String
	 **/
	public String getUrl() {
		return url;
	}
	/**
	 * url attribute ???????.
	 * @param url String
	 **/
	public void setUrl(String url) {
		this.url = url;
	}
	/**
	 * ip attribute ?????.
	 * @return String
	 **/
	public String getIp() {
		return ip;
	}
	/**
	 * ip attribute ???????.
	 * @param ip String
	 **/
	public void setIp(String ip) {
		this.ip = ip;
	}
	/**
	 * dn attribute ?????.
	 * @return String
	 **/
	public String getDn() {
		return dn;
	}
	/**
	 * dn attribute ???????.
	 * @param dn String
	 **/
	public void setDn(String dn) {
		this.dn = dn;
	}
	/**
	 * @return the orgnztNm
	 **/
	public String getOrgnztNm() {
		return orgnztNm;
	}
	/**
	 * @param orgnztNm the orgnztNm to set
	 **/
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	
	/**
	 * ????? ?????????.
	 * @return onepassUserkey
	 **/
	public String getOnepassUserkey() {
		return onepassUserkey;
	}
	/**
	 * ????? ??????????.
	 * @param onepassUserkey
	 **/
	public void setOnepassUserkey(String onepassUserkey) {
		this.onepassUserkey = onepassUserkey;
	}
	/**
	 * ????? ????????????.
	 * @return
	 **/
	public String getOnepassIntfToken() {
		return onepassIntfToken;
	}
	/**
	 * ????? ?????????????.
	 * @param onepassIntfToken
	 **/
	public void setOnepassIntfToken(String onepassIntfToken) {
		this.onepassIntfToken = onepassIntfToken;
	}

}
