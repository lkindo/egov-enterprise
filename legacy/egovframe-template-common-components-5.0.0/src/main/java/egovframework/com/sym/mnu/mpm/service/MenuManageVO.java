package egovframework.com.sym.mnu.mpm.service;

/**
 * 硫붾돱紐⑸줉愿由?泥섎━瑜??꾪븳 VO ?대옒?ㅻⅤ瑜??뺤쓽?쒕떎
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2025.07.17  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public class MenuManageVO {

	/** 硫붾돱?뺣낫 */
	/** 硫붾돱踰덊샇 */
	private int menuNo;
	/** 硫붾돱?쒖꽌 */
	private int menuOrdr;
	/** 硫붾돱紐?*/
	private String menuNm;
	/** ?곸쐞硫붾돱踰덊샇 */
	private int upperMenuId;
	/** 硫붾돱?ㅻ챸 */
	private String menuDc;
	/** 愿?⑥씠誘몄?寃쎈줈 */
	private String relateImagePath;
	/** 愿?⑥씠誘몄?紐?*/
	private String relateImageNm;
	/** ?꾨줈洹몃옩?뚯씪紐?*/
	private String progrmFileNm;

	/** ?ъ씠?몃㏊ */
	/** ?앹꽦?륤D **/
	private String creatPersonId;

	/** 沅뚰븳?뺣낫?ㅼ젙 */
	/** 沅뚰븳肄붾뱶 */
	private String authorCode;

	/** 湲고?VO蹂??*/
	private String tempValue;
	private int tempInt;

	/** Login 硫붾돱愿??VO蹂??*/
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
	 * menuOrdr attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getMenuOrdr() {
		return menuOrdr;
	}

	/**
	 * menuOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param menuOrdr int
	 */
	public void setMenuOrdr(int menuOrdr) {
		this.menuOrdr = menuOrdr;
	}

	/**
	 * menuNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getMenuNm() {
		return menuNm;
	}

	/**
	 * menuNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param menuNm String
	 */
	public void setMenuNm(String menuNm) {
		this.menuNm = menuNm;
	}

	/**
	 * upperMenuId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getUpperMenuId() {
		return upperMenuId;
	}

	/**
	 * upperMenuId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param upperMenuId int
	 */
	public void setUpperMenuId(int upperMenuId) {
		this.upperMenuId = upperMenuId;
	}

	/**
	 * menuDc attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getMenuDc() {
		return menuDc;
	}

	/**
	 * menuDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param menuDc String
	 */
	public void setMenuDc(String menuDc) {
		this.menuDc = menuDc;
	}

	/**
	 * relateImagePath attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getRelateImagePath() {
		return relateImagePath;
	}

	/**
	 * relateImagePath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param relateImagePath String
	 */
	public void setRelateImagePath(String relateImagePath) {
		this.relateImagePath = relateImagePath;
	}

	/**
	 * relateImageNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getRelateImageNm() {
		return relateImageNm;
	}

	/**
	 * relateImageNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param relateImageNm String
	 */
	public void setRelateImageNm(String relateImageNm) {
		this.relateImageNm = relateImageNm;
	}

	/**
	 * progrmFileNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getProgrmFileNm() {
		return progrmFileNm;
	}

	/**
	 * progrmFileNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param progrmFileNm String
	 */
	public void setProgrmFileNm(String progrmFileNm) {
		this.progrmFileNm = progrmFileNm;
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
	 * tmp_Id attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_Password attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_Name attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_UserSe attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_Email attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_OrgnztId attribute瑜?由ы꽩?쒕떎.
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
	 * tmp_UniqId attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTmpUniqId() {
		return tmpUniqId;
	}

	/**
	 * tmp_UniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tmp_UniqId String
	 */
	public void setTmpUniqId(String tmpUniqId) {
		this.tmpUniqId = tmpUniqId;
	}

	/**
	 * tmp_Cmd attribute瑜?由ы꽩?쒕떎.
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
	 * tempValue attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getTempValue() {
		return tempValue;
	}

	/**
	 * tempValue attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tempValue String
	 */
	public void setTempValue(String tempValue) {
		this.tempValue = tempValue;
	}

	/**
	 * tempInt attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getTempInt() {
		return tempInt;
	}

	/**
	 * tempInt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param tempInt int
	 */
	public void setTempInt(int tempInt) {
		this.tempInt = tempInt;
	}
}