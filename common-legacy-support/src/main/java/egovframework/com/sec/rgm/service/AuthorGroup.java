package egovframework.com.sec.rgm.service;

import egovframework.com.cmm.ComDefaultVO;


/**
 * ??????model ?????? ???.
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *
 * </pre>
 **/

public class AuthorGroup extends ComDefaultVO {
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ???
	 **/
	private AuthorGroup authorGroup;	
	/**
	 * ???????????ID
	 **/
	private String userId;
	/**
	 * ????????????
	 **/
	private String userNm;
	/**
	 * ???????ID
	 **/
	private String groupId;	
	/**
	 * ???????????? ??
	 **/
	private String mberTyCode;
	/**
	 * ???????????? ?
	 **/	
	private String mberTyNm;
	/**
	 * 
	 **/
	private String authorCode;
	/**
	 * ? ???
	 **/
	private String regYn;
	/**
	 * Uniq ID
	 **/
	private String uniqId;
	
	/**
	 * authorGroup attribute ?????.
	 * @return AuthorGroup
	 **/
	public AuthorGroup getAuthorGroup() {
		return authorGroup;
	}
	/**
	 * authorGroup attribute ???????.
	 * @param authorGroup AuthorGroup 
	 **/
	public void setAuthorGroup(AuthorGroup authorGroup) {
		this.authorGroup = authorGroup;
	}
	/**
	 * userId attribute ?????.
	 * @return String
	 **/
	public String getUserId() {
		return userId;
	}
	/**
	 * userId attribute ???????.
	 * @param userId String 
	 **/
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * userNm attribute ?????.
	 * @return String
	 **/
	public String getUserNm() {
		return userNm;
	}
	/**
	 * userNm attribute ???????.
	 * @param userNm String 
	 **/
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * groupId attribute ?????.
	 * @return String
	 **/
	public String getGroupId() {
		return groupId;
	}
	/**
	 * groupId attribute ???????.
	 * @param groupId String 
	 **/
	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}
	/**
	 * mberTyCode attribute ?????.
	 * @return String
	 **/
	public String getMberTyCode() {
		return mberTyCode;
	}
	/**
	 * mberTyCode attribute ???????.
	 * @param mberTyCode String 
	 **/
	public void setMberTyCode(String mberTyCode) {
		this.mberTyCode = mberTyCode;
	}
	/**
	 * mberTyNm attribute ?????.
	 * @return String
	 **/
	public String getMberTyNm() {
		return mberTyNm;
	}
	/**
	 * mberTyNm attribute ???????.
	 * @param mberTyNm String 
	 **/
	public void setMberTyNm(String mberTyNm) {
		this.mberTyNm = mberTyNm;
	}
	/**
	 * authorCode attribute ?????.
	 * @return String
	 **/
	public String getAuthorCode() {
		return authorCode;
	}
	/**
	 * authorCode attribute ???????.
	 * @param authorCode String 
	 **/
	public void setAuthorCode(String authorCode) {
		this.authorCode = authorCode;
	}
	/**
	 * regYn attribute ?????.
	 * @return String
	 **/
	public String getRegYn() {
		return regYn;
	}
	/**
	 * regYn attribute ???????.
	 * @param regYn String 
	 **/
	public void setRegYn(String regYn) {
		this.regYn = regYn;
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
	

	
	
}
