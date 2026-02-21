package egovframework.com.cmm;

import java.io.Serializable;

/**
 * ??VO ?????
 * 
 * @author ???????? ???
 * @since 2009.03.06
 * @version 1.0
 * @see
 * 
 *      <pre>
 * << ?????Modification Information) >>
 * 
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2009.03.06  ???         ????
 * 
 *      </pre>
 **/
public class SessionVO implements Serializable {

	private static final long serialVersionUID = -339733578190300267L;

	/** ???**/
	private String sUserId;
	/** ???**/
	private String sUserNm;
	/** ????**/
	private String sEmail;
	/** ???????**/
	private String sUserSe;
	/** ????ID **/
	private String orgnztId;
	/** ?????**/
	private String uniqId;

	/**
	 * sUserId attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSUserId() {
		return sUserId;
	}

	/**
	 * sUserId attribute ???????.
	 * 
	 * @param sUserId String
	 **/
	public void setSUserId(String userId) {
		sUserId = userId;
	}

	/**
	 * sUserNm attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSUserNm() {
		return sUserNm;
	}

	/**
	 * sUserNm attribute ???????.
	 * 
	 * @param sUserNm String
	 **/
	public void setSUserNm(String userNm) {
		sUserNm = userNm;
	}

	/**
	 * sEmail attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSEmail() {
		return sEmail;
	}

	/**
	 * sEmail attribute ???????.
	 * 
	 * @param sEmail String
	 **/
	public void setSEmail(String email) {
		sEmail = email;
	}

	/**
	 * sUserSe attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSUserSe() {
		return sUserSe;
	}

	/**
	 * sUserSe attribute ???????.
	 * 
	 * @param sUserSe String
	 **/
	public void setSUserSe(String userSe) {
		sUserSe = userSe;
	}

	/**
	 * orgnztId attribute ?????.
	 * 
	 * @return String
	 **/
	public String getOrgnztId() {
		return orgnztId;
	}

	/**
	 * orgnztId attribute ???????.
	 * 
	 * @param orgnztId String
	 **/
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}

	/**
	 * uniqId attribute ?????.
	 * 
	 * @return String
	 **/
	public String getUniqId() {
		return uniqId;
	}

	/**
	 * uniqId attribute ???????.
	 * 
	 * @param uniqId String
	 **/
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}
}
