package egovframework.com.sym.mnu.mcm.service;

/**
 * ?ъ씠?몃㏊/硫붿씤硫붾돱 泥섎━瑜??꾪븳 VO ?대옒?ㅻⅤ瑜??뺤쓽?쒕떎
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2025.07.16  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public class MenuSiteMapVO {

	/** 硫붾돱踰덊샇 */
	private int menuNo;

	/* ?ъ씠?몃㏊ */
	/** ?앹꽦?륤D **/
	private String creatPersonId;
	/** 留듭깮?켌D */
	private String mapCreatId;
	/** 留듯뙆?쇰챸 */
	private String bndeFileNm;
	/** 留듯뙆?쇨꼍濡?*/
	private String bndeFilePath;

	/* 沅뚰븳?뺣낫?ㅼ젙 */
	/** 沅뚰븳肄붾뱶 */
	private String authorCode;
	/** 沅뚰븳紐?*/
	private String authorNm;
	/** 沅뚰븳?ㅻ챸 */
	private String authorDc;
	/** 沅뚰븳?앹꽦?쇱옄 */
	private String authorCreatDe;

	/* 湲고?VO蹂??*/
	/** rootPath Temp */
	private String tmpRootPath;

	/* Login 硫붾돱愿??VO蹂??*/
	/** tmp_Id */
	private String tmpId;
	/** tmp_Password */
	private String tmpPassword;
	/** tmp_Name */
	private String tmpName;
	/** tmp_UserSe */
	private String tmpUserSe;
	/** tmp_Email */
	private String tmpEmail;
	/** tmp_OrgnztId */
	private String tmpOrgnztId;
	/** tmp_UniqId */
	private String tmpUniqId;
	/** tmp_Cmd */
	private String tmpCmd;

	/**
	 * menuNo attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getMenuNo() {
		return menuNo;
	}

	/**
	 * menuNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param menuNo int
	 */
	public void setMenuNo(int menuNo) {
		this.menuNo = menuNo;
	}

	/**
	 * creatPersonId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getCreatPersonId() {
		return creatPersonId;
	}

	/**
	 * creatPersonId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param creatPersonId String
	 */
	public void setCreatPersonId(String creatPersonId) {
		this.creatPersonId = creatPersonId;
	}

	/**
	 * mapCreatId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getMapCreatId() {
		return mapCreatId;
	}

	/**
	 * mapCreatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param mapCreatId String
	 */
	public void setMapCreatId(String mapCreatId) {
		this.mapCreatId = mapCreatId;
	}

	/**
	 * bndeFileNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getBndeFileNm() {
		return bndeFileNm;
	}

	/**
	 * bndeFileNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param bndeFileNm String
	 */
	public void setBndeFileNm(String bndeFileNm) {
		this.bndeFileNm = bndeFileNm;
	}

	/**
	 * bndeFilePath attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getBndeFilePath() {
		return bndeFilePath;
	}

	/**
	 * bndeFilePath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param bndeFilePath String
	 */
	public void setBndeFilePath(String bndeFilePath) {
		this.bndeFilePath = bndeFilePath;
	}

	/**
	 * authorCode attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAuthorCode() {
		return authorCode;
	}

	/**
	 * authorCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param authorCode String
	 */
	public void setAuthorCode(String authorCode) {
		this.authorCode = authorCode;
	}

	/**
	 * authorNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAuthorNm() {
		return authorNm;
	}

	/**
	 * authorNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param authorNm String
	 */
	public void setAuthorNm(String authorNm) {
		this.authorNm = authorNm;
	}

	/**
	 * authorDc attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAuthorDc() {
		return authorDc;
	}

	/**
	 * authorDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param authorDc String
	 */
	public void setAuthorDc(String authorDc) {
		this.authorDc = authorDc;
	}

	/**
	 * authorCreatDe attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getAuthorCreatDe() {
		return authorCreatDe;
	}

	/**
	 * authorCreatDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param authorCreatDe String
	 */
	public void setAuthorCreatDe(String authorCreatDe) {
		this.authorCreatDe = authorCreatDe;
	}

	/**
	 * tmpId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpId() {
		return tmpId;
	}

	/**
	 * tmpId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpId String
	 */
	public void setTmpId(String tmpId) {
		this.tmpId = tmpId;
	}

	/**
	 * tmpPassword attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpPassword() {
		return tmpPassword;
	}

	/**
	 * tmpPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpPassword String
	 */
	public void setTmpPassword(String tmpPassword) {
		this.tmpPassword = tmpPassword;
	}

	/**
	 * tmpName attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpName() {
		return tmpName;
	}

	/**
	 * tmpName attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpName String
	 */
	public void setTmpName(String tmpName) {
		this.tmpName = tmpName;
	}

	/**
	 * tmpUserSe attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpUserSe() {
		return tmpUserSe;
	}

	/**
	 * tmpUserSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpUserSe String
	 */
	public void setTmpUserSe(String tmpUserSe) {
		this.tmpUserSe = tmpUserSe;
	}

	/**
	 * tmpEmail attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpEmail() {
		return tmpEmail;
	}

	/**
	 * tmpEmail attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpEmail String
	 */
	public void setTmpEmail(String tmpEmail) {
		this.tmpEmail = tmpEmail;
	}

	/**
	 * tmpOrgnztId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpOrgnztId() {
		return tmpOrgnztId;
	}

	/**
	 * tmpOrgnztId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpOrgnztId String
	 */
	public void setTmpOrgnztId(String tmpOrgnztId) {
		this.tmpOrgnztId = tmpOrgnztId;
	}

	/**
	 * tmpUniqId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpUniqId() {
		return tmpUniqId;
	}

	/**
	 * tmpUniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpUniqId String
	 */
	public void setTmpUniqId(String tmpUniqId) {
		this.tmpUniqId = tmpUniqId;
	}

	/**
	 * tmpCmd attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpCmd() {
		return tmpCmd;
	}

	/**
	 * tmpCmd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmpCmd String
	 */
	public void setTmpCmd(String tmpCmd) {
		this.tmpCmd = tmpCmd;
	}

	/**
	 * tmprootPath attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpRootPath() {
		return tmpRootPath;
	}

	/**
	 * tmprootPath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmprootPath String
	 */
	public void setTmpRootPath(String tmprootPath) {
		this.tmpRootPath = tmprootPath;
	}

}
