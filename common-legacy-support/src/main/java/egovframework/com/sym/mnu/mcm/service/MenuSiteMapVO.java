package egovframework.com.sym.mnu.mcm.service;

/**
 * ????          ?                         ?      ??          VO ??  ???      ???         ??         
 * 
 * @author             ??                   ?? ??      
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  ==          ???  ??Modification Information) ==
 *
 *   ??      ??     ??      ??          ??      ??      
 *  -------    --------    ---------------------------
 *   2009.03.20  ??                          ????      
 *   2025.07.16  ??     ??         2025???      ?      ????PMD   ???      ?         ??            ??                ???     ???      ??      -FormalParameterNamingConventions(        ??      ??            ?????
 *
 *      </pre>
 */
public class MenuSiteMapVO {

	/** ?? **/
	private int menuNo;

	/* ???? */
	/** ??? ***/
	private String creatPersonId;
	/** ? **/
	private String mapCreatId;
	/** ??? **/
	private String bndeFileNm;
	/** ????**/
	private String bndeFilePath;

	/* ??? */
	/**  **/
	private String authorCode;
	/** ?**/
	private String authorNm;
	/** ?? **/
	private String authorDc;
	/** ???? **/
	private String authorCreatDe;

	/* ?VO??*/
	/** rootPath Temp **/
	private String tmpRootPath;

	/* Login ????VO??*/
	/** tmp_Id **/
	private String tmpId;
	/** tmp_Password **/
	private String tmpPassword;
	/** tmp_Name **/
	private String tmpName;
	/** tmp_UserSe **/
	private String tmpUserSe;
	/** tmp_Email **/
	private String tmpEmail;
	/** tmp_OrgnztId **/
	private String tmpOrgnztId;
	/** tmp_UniqId **/
	private String tmpUniqId;
	/** tmp_Cmd **/
	private String tmpCmd;

	/**
	 * menuNo attribute?????.
	 * 
	 * @return int
	 **/
	public int getMenuNo() {
		return menuNo;
	}

	/**
	 * menuNo attribute ???????.
	 * 
	 * @param menuNo int
	 **/
	public void setMenuNo(int menuNo) {
		this.menuNo = menuNo;
	}

	/**
	 * creatPersonId attribute?????.
	 * 
	 * @return String
	 **/
	public String getCreatPersonId() {
		return creatPersonId;
	}

	/**
	 * creatPersonId attribute ???????.
	 * 
	 * @param creatPersonId String
	 **/
	public void setCreatPersonId(String creatPersonId) {
		this.creatPersonId = creatPersonId;
	}

	/**
	 * mapCreatId attribute?????.
	 * 
	 * @return String
	 **/
	public String getMapCreatId() {
		return mapCreatId;
	}

	/**
	 * mapCreatId attribute ???????.
	 * 
	 * @param mapCreatId String
	 **/
	public void setMapCreatId(String mapCreatId) {
		this.mapCreatId = mapCreatId;
	}

	/**
	 * bndeFileNm attribute?????.
	 * 
	 * @return String
	 **/
	public String getBndeFileNm() {
		return bndeFileNm;
	}

	/**
	 * bndeFileNm attribute ???????.
	 * 
	 * @param bndeFileNm String
	 **/
	public void setBndeFileNm(String bndeFileNm) {
		this.bndeFileNm = bndeFileNm;
	}

	/**
	 * bndeFilePath attribute?????.
	 * 
	 * @return String
	 **/
	public String getBndeFilePath() {
		return bndeFilePath;
	}

	/**
	 * bndeFilePath attribute ???????.
	 * 
	 * @param bndeFilePath String
	 **/
	public void setBndeFilePath(String bndeFilePath) {
		this.bndeFilePath = bndeFilePath;
	}

	/**
	 * authorCode attribute?????.
	 * 
	 * @return String
	 **/
	public String getAuthorCode() {
		return authorCode;
	}

	/**
	 * authorCode attribute ???????.
	 * 
	 * @param authorCode String
	 **/
	public void setAuthorCode(String authorCode) {
		this.authorCode = authorCode;
	}

	/**
	 * authorNm attribute?????.
	 * 
	 * @return String
	 **/
	public String getAuthorNm() {
		return authorNm;
	}

	/**
	 * authorNm attribute ???????.
	 * 
	 * @param authorNm String
	 **/
	public void setAuthorNm(String authorNm) {
		this.authorNm = authorNm;
	}

	/**
	 * authorDc attribute?????.
	 * 
	 * @return String
	 **/
	public String getAuthorDc() {
		return authorDc;
	}

	/**
	 * authorDc attribute ???????.
	 * 
	 * @param authorDc String
	 **/
	public void setAuthorDc(String authorDc) {
		this.authorDc = authorDc;
	}

	/**
	 * authorCreatDe attribute?????.
	 * 
	 * @return String
	 **/
	public String getAuthorCreatDe() {
		return authorCreatDe;
	}

	/**
	 * authorCreatDe attribute ???????.
	 * 
	 * @param authorCreatDe String
	 **/
	public void setAuthorCreatDe(String authorCreatDe) {
		this.authorCreatDe = authorCreatDe;
	}

	/**
	 * tmpId attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpId() {
		return tmpId;
	}

	/**
	 * tmpId attribute ???????.
	 * 
	 * @param tmpId String
	 **/
	public void setTmpId(String tmpId) {
		this.tmpId = tmpId;
	}

	/**
	 * tmpPassword attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpPassword() {
		return tmpPassword;
	}

	/**
	 * tmpPassword attribute ???????.
	 * 
	 * @param tmpPassword String
	 **/
	public void setTmpPassword(String tmpPassword) {
		this.tmpPassword = tmpPassword;
	}

	/**
	 * tmpName attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpName() {
		return tmpName;
	}

	/**
	 * tmpName attribute ???????.
	 * 
	 * @param tmpName String
	 **/
	public void setTmpName(String tmpName) {
		this.tmpName = tmpName;
	}

	/**
	 * tmpUserSe attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpUserSe() {
		return tmpUserSe;
	}

	/**
	 * tmpUserSe attribute ???????.
	 * 
	 * @param tmpUserSe String
	 **/
	public void setTmpUserSe(String tmpUserSe) {
		this.tmpUserSe = tmpUserSe;
	}

	/**
	 * tmpEmail attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpEmail() {
		return tmpEmail;
	}

	/**
	 * tmpEmail attribute ???????.
	 * 
	 * @param tmpEmail String
	 **/
	public void setTmpEmail(String tmpEmail) {
		this.tmpEmail = tmpEmail;
	}

	/**
	 * tmpOrgnztId attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpOrgnztId() {
		return tmpOrgnztId;
	}

	/**
	 * tmpOrgnztId attribute ???????.
	 * 
	 * @param tmpOrgnztId String
	 **/
	public void setTmpOrgnztId(String tmpOrgnztId) {
		this.tmpOrgnztId = tmpOrgnztId;
	}

	/**
	 * tmpUniqId attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpUniqId() {
		return tmpUniqId;
	}

	/**
	 * tmpUniqId attribute ???????.
	 * 
	 * @param tmpUniqId String
	 **/
	public void setTmpUniqId(String tmpUniqId) {
		this.tmpUniqId = tmpUniqId;
	}

	/**
	 * tmpCmd attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpCmd() {
		return tmpCmd;
	}

	/**
	 * tmpCmd attribute ???????.
	 * 
	 * @param tmpCmd String
	 **/
	public void setTmpCmd(String tmpCmd) {
		this.tmpCmd = tmpCmd;
	}

	/**
	 * tmprootPath attribute?????.
	 * 
	 * @return String
	 **/
	public String getTmpRootPath() {
		return tmpRootPath;
	}

	/**
	 * tmprootPath attribute ???????.
	 * 
	 * @param tmprootPath String
	 **/
	public void setTmpRootPath(String tmprootPath) {
		this.tmpRootPath = tmprootPath;
	}

}
