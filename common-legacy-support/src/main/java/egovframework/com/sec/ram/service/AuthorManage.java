package egovframework.com.sec.ram.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?? ????model ?????? ???.
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
 *   2024.10.29	LeeBaekHaeng	??????????PK ??????
 * </pre>
 **/

public class AuthorManage extends ComDefaultVO {

	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ???
	 **/	
	private AuthorManage authorManage;
	/**
	 * 
	 **/
	private String authorCode;
	/**
	 *  ????
	 **/
	private String authorCodeEncrypt;
	/**
	 * ???
	 **/
	private String authorCreatDe;
	/**
	 * ??
	 **/
	private String authorDc;
	/**
	 * ??
	 **/
	private String authorNm;
	
	/**
	 * authorManage attribute ?????.
	 * @return AuthorManage
	 **/
	public AuthorManage getAuthorManage() {
		return authorManage;
	}
	/**
	 * authorManage attribute ???????.
	 * @param authorManage AuthorManage 
	 **/
	public void setAuthorManage(AuthorManage authorManage) {
		this.authorManage = authorManage;
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

	public String getAuthorCodeEncrypt() {
		return authorCodeEncrypt;
	}

	public void setAuthorCodeEncrypt(String authorCodeEncrypt) {
		this.authorCodeEncrypt = authorCodeEncrypt;
	}

	/**
	 * authorCreatDe attribute ?????.
	 * @return String
	 **/
	public String getAuthorCreatDe() {
		return authorCreatDe;
	}
	/**
	 * authorCreatDe attribute ???????.
	 * @param authorCreatDe String 
	 **/
	public void setAuthorCreatDe(String authorCreatDe) {
		this.authorCreatDe = authorCreatDe;
	}
	/**
	 * authorDc attribute ?????.
	 * @return String
	 **/
	public String getAuthorDc() {
		return authorDc;
	}
	/**
	 * authorDc attribute ???????.
	 * @param authorDc String 
	 **/
	public void setAuthorDc(String authorDc) {
		this.authorDc = authorDc;
	}
	/**
	 * authorNm attribute ?????.
	 * @return String
	 **/
	public String getAuthorNm() {
		return authorNm;
	}
	/**
	 * authorNm attribute ???????.
	 * @param authorNm String 
	 **/
	public void setAuthorNm(String authorNm) {
		this.authorNm = authorNm;
	}
	


	

}
