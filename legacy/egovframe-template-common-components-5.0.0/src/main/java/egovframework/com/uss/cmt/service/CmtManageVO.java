package egovframework.com.uss.cmt.service;

import java.io.Serializable;
import java.util.List;

/**
 * 異쒗눜洹쇨?由?VO ?대옒??
 * 
 * @author ?쒖??꾨젅?꾩썙?ъ꽱??媛쒕컻?
 * @since 2014.12.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.12.20  媛쒕컻?          理쒖큹 ?앹꽦
 *   2025.08.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public class CmtManageVO implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 湲곕낯 ?앹꽦??
	 */
	public CmtManageVO() {
		// constructor
	}

	/** ?볤? 愿由?紐⑸줉 */
	private List<CmtManageVO> cmtManageList;

	/**
	 * @return ?볤? 愿由?紐⑸줉??諛섑솚?⑸땲??
	 */
	public List<CmtManageVO> getCmtManageList() {
		return cmtManageList;
	}

	/**
	 * @param cmtManageList ?ㅼ젙???볤? 愿由?紐⑸줉
	 */
	public void setCmtManageList(List<CmtManageVO> cmtManageList) {
		this.cmtManageList = cmtManageList;
	}

	/** ?ъ슜???대쫫 臾몄옄??*/
	private String userNmString;

	/**
	 * @return ?ъ슜???대쫫 臾몄옄?댁쓣 諛섑솚?⑸땲??
	 */
	public String getUserNmString() {
		return userNmString;
	}

	/**
	 * @param userNmString ?ㅼ젙???ъ슜???대쫫 臾몄옄??
	 */
	public void setUserNmString(String userNmString) {
		this.userNmString = userNmString;
	}

	/** ?ъ슜???앸퀎??*/
	private String usid;

	/**
	 * @return ?ъ슜???앸퀎?먮? 諛섑솚?⑸땲??
	 */
	public String getUsid() {
		return usid;
	}

	/**
	 * @param usid ?ㅼ젙???ъ슜???앸퀎??
	 */
	public void setUsid(String usid) {
		this.usid = usid;
	}

	/** ?묒뾽 ?쒖옉 ?곹깭 */
	private String wrkStartStatus;

	/**
	 * @return ?묒뾽 ?쒖옉 ?곹깭瑜?諛섑솚?⑸땲??
	 */
	public String getWrkStartStatus() {
		return wrkStartStatus;
	}

	/**
	 * @param workStartStatus ?ㅼ젙???묒뾽 ?쒖옉 ?곹깭
	 */
	public void setWrkStartStatus(String workStartStatus) {
		this.wrkStartStatus = workStartStatus;
	}

	/** ?묒뾽 醫낅즺 ?곹깭 */
	private String wrkEndStatus;

	/**
	 * @return ?묒뾽 醫낅즺 ?곹깭瑜?諛섑솚?⑸땲??
	 */
	public String getWrkEndStatus() {
		return wrkEndStatus;
	}

	/**
	 * @param workEndStatus ?ㅼ젙???묒뾽 醫낅즺 ?곹깭
	 */
	public void setWrkEndStatus(String workEndStatus) {
		this.wrkEndStatus = workEndStatus;
	}

	/** ?좎쭨 */
	private String date;

	/**
	 * @return ?좎쭨瑜?諛섑솚?⑸땲??
	 */
	public String getDate() {
		return date;
	}

	/**
	 * @param date ?ㅼ젙???좎쭨
	 */
	public void setDate(String date) {
		this.date = date;
	}

	/** ?묒뾽 ?쒓컙 */
	private String wrkHours;

	/**
	 * @return ?묒뾽 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getWrkHours() {
		return wrkHours;
	}

	/**
	 * @param workHours ?ㅼ젙???묒뾽 ?쒓컙
	 */
	public void setWrkHours(String workHours) {
		this.wrkHours = workHours;
	}

	/** ?묒뾽 ?쒓컙 ID */
	private String wrktmId;

	/**
	 * @return ?묒뾽 ?쒓컙 ID瑜?諛섑솚?⑸땲??
	 */
	public String getWrktmId() {
		return wrktmId;
	}

	/**
	 * @param wrktmId ?ㅼ젙???묒뾽 ?쒓컙 ID
	 */
	public void setWrktmId(String wrktmId) {
		this.wrktmId = wrktmId;
	}

	/** ?묒뾽 ?쒖옉 ?쒓컙 */
	private String wrkStartTime;

	/**
	 * @return ?묒뾽 ?쒖옉 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getWrkStartTime() {
		return wrkStartTime;
	}

	/**
	 * @param wrkStartTime ?ㅼ젙???묒뾽 ?쒖옉 ?쒓컙
	 */
	public void setWrkStartTime(String wrkStartTime) {
		this.wrkStartTime = wrkStartTime;
	}

	/** ?묒뾽 醫낅즺 ?쒓컙 */
	private String wrkEndTime;

	/**
	 * @return ?묒뾽 醫낅즺 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getWrkEndTime() {
		return wrkEndTime;
	}

	/**
	 * @param wrkEndTime ?ㅼ젙???묒뾽 醫낅즺 ?쒓컙
	 */
	public void setWrkEndTime(String wrkEndTime) {
		this.wrkEndTime = wrkEndTime;
	}

	/** 珥덇낵 ?묒뾽 ?쒓컙 */
	private String ovtmwrkHours;

	/**
	 * @return 珥덇낵 ?묒뾽 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getOvtmwrkHours() {
		return ovtmwrkHours;
	}

	/**
	 * @param ovtmwrkHours ?ㅼ젙??珥덇낵 ?묒뾽 ?쒓컙
	 */
	public void setOvtmwrkHours(String ovtmwrkHours) {
		this.ovtmwrkHours = ovtmwrkHours;
	}

	/** 鍮꾧퀬 */
	private String rm;

	/**
	 * @return 鍮꾧퀬瑜?諛섑솚?⑸땲??
	 */
	public String getRm() {
		return rm;
	}

	/**
	 * @param rm ?ㅼ젙??鍮꾧퀬
	 */
	public void setRm(String rm) {
		this.rm = rm;
	}

	/** 吏곸썝 ID */
	private String emplyrId;

	/**
	 * @return 吏곸썝 ID瑜?諛섑솚?⑸땲??
	 */
	public String getEmplyrId() {
		return emplyrId;
	}

	/**
	 * @param emplyrId ?ㅼ젙??吏곸썝 ID
	 */
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}

	/** 議곗쭅 ID */
	private String orgnztId;

	/**
	 * @return 議곗쭅 ID瑜?諛섑솚?⑸땲??
	 */
	public String getOrgnztId() {
		return orgnztId;
	}

	/**
	 * @param orgnztId ?ㅼ젙??議곗쭅 ID
	 */
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}

	/** ?묒뾽 ?좎쭨 */
	private String wrktDt;

	/**
	 * @return ?묒뾽 ?좎쭨瑜?諛섑솚?⑸땲??
	 */
	public String getWrktDt() {
		return wrktDt;
	}

	/**
	 * @param wrktDt ?ㅼ젙???묒뾽 ?좎쭨
	 */
	public void setWrktDt(String wrktDt) {
		this.wrktDt = wrktDt;
	}

}
