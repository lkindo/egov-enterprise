package egovframework.com.sec.ram.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 沅뚰븳愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *   2024.10.29	LeeBaekHaeng	?쒗걧?댁퐫???쇰젴踰덊샇 PK ?뚮씪誘명꽣 ?붾났?명솕
 * </pre>
 */

public class AuthorManage extends ComDefaultVO {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 沅뚰븳愿由?
	 */	
	private AuthorManage authorManage;
	/**
	 * 沅뚰븳肄붾뱶
	 */
	private String authorCode;
	/**
	 * 沅뚰븳肄붾뱶 ?뷀샇??
	 */
	private String authorCodeEncrypt;
	/**
	 * 沅뚰븳?깅줉?쇱옄
	 */
	private String authorCreatDe;
	/**
	 * 沅뚰븳肄붾뱶?ㅻ챸
	 */
	private String authorDc;
	/**
	 * 沅뚰븳 紐?
	 */
	private String authorNm;
	
	/**
	 * authorManage attribute 瑜?由ы꽩?쒕떎.
	 * @return AuthorManage
	 */
	public AuthorManage getAuthorManage() {
		return authorManage;
	}
	/**
	 * authorManage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorManage AuthorManage 
	 */
	public void setAuthorManage(AuthorManage authorManage) {
		this.authorManage = authorManage;
	}
	/**
	 * authorCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAuthorCode() {
		return authorCode;
	}
	/**
	 * authorCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorCode String 
	 */
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
	 * authorCreatDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAuthorCreatDe() {
		return authorCreatDe;
	}
	/**
	 * authorCreatDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorCreatDe String 
	 */
	public void setAuthorCreatDe(String authorCreatDe) {
		this.authorCreatDe = authorCreatDe;
	}
	/**
	 * authorDc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAuthorDc() {
		return authorDc;
	}
	/**
	 * authorDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorDc String 
	 */
	public void setAuthorDc(String authorDc) {
		this.authorDc = authorDc;
	}
	/**
	 * authorNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAuthorNm() {
		return authorNm;
	}
	/**
	 * authorNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorNm String 
	 */
	public void setAuthorNm(String authorNm) {
		this.authorNm = authorNm;
	}
	


	

}
