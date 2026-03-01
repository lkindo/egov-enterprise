package egovframework.com.uss.umt.service;

/**
 * 湲곗뾽?뚯썝VO?대옒?ㅻ줈??湲곗뾽?뚯썝愿由?鍮꾩??덉뒪濡쒖쭅 泥섎━????ぉ??援ъ꽦?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  議곗옱??         理쒖큹 ?앹꽦
 *   2017.07.21  ?λ룞??			濡쒓렇?몄씤利앹젣???묒뾽
 *
 * </pre>
 */
public class EntrprsManageVO  extends UserDefaultVO{

	private static final long serialVersionUID = -6532736688851136256L;

	/** ?댁쟾鍮꾨?踰덊샇 - 鍮꾨?踰덊샇 蹂寃쎌떆 ?ъ슜*/
    private String oldPassword = "";

    /**
	 * ?ъ슜?먭퀬?좎븘?대뵒
	 */
	private String uniqId="";
	/**
	 * ?ъ슜???좏삎
	 */
	private String userTy;
	/**
	 * 二쇱냼
	 */
	private String adres;
	/**
	 * ?곸꽭二쇱냼
	 */
	private String detailAdres;
	/**
	 * ?좎껌??二쇰??깅줉踰덊샇
	 */
	private String applcntIhidnum;
	/**
	 * ?좎껌??紐?
	 */
	private String applcntNm;
	/**
	 * ?ъ뾽?먮쾲??
	 */
	private String bizrno;
	/**
	 * ?뚯궗紐?
	 */
	private String cmpnyNm;
	/**
	 * ??쒖씠??
	 */
	private String cxfc;
	/**
	 * 湲곗뾽 ?뚯썝 ID
	 */
	private String entrprsmberId;
	/**
	 * 湲곗뾽 ?뚯썝 鍮꾨?踰덊샇
	 */
	private String entrprsMberPassword;
	/**
	 * 湲곗뾽 ?뚯썝 鍮꾨?踰덊샇 ?뺣떟
	 */
	private String entrprsMberPasswordCnsr;
	/**
	 * 湲곗뾽 ?뚯썝 鍮꾨?踰덊샇 ?뚰듃
	 */
	private String entrprsMberPasswordHint;
	/**
	 * 湲곗뾽 ?뚯썝 ?곹깭
	 */
	private String entrprsMberSttus;
	/**
	 * 湲곗뾽援щ텇肄붾뱶
	 */
	private String entrprsSeCode;
	/**
	 * ?⑹뒪踰덊샇
	 */
	private String fxnum;
	/**
	 * 洹몃９ ID
	 */
	private String groupId;
	/**
	 * ?낆쥌肄붾뱶
	 */
	private String indutyCode;
	/**
	 * 踰뺤씤?깅줉踰덊샇
	 */
	private String jurirno;
	/**
	 * 吏??쾲??
	 */
	private String areaNo;
	/**
	 * ?뚯궗?앹쟾?붾쾲??
	 */
	private String entrprsEndTelno;
	/**
	 * ?뚯궗以묎컙?꾪솕踰덊샇
	 */
	private String entrprsMiddleTelno;
	/**
	 * 媛???쇱옄
	 */
	private String sbscrbDe;
	/**
	 * ?고렪踰덊샇
	 */
	private String zip;
	/**
	 * ?좎껌???대찓?쇱＜??
	 */
	private String applcntEmailAdres;
	
	private String lockAt;
	public String getLockAt() {return lockAt;}
	public void setLockAt(String lockAt) {this.lockAt = lockAt;}
	
	/**
	 * oldPassword attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOldPassword() {
		return oldPassword;
	}
	/**
	 * oldPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param oldPassword String
	 */
	public void setOldPassword(String oldPassword) {
		this.oldPassword = oldPassword;
	}
	/**
	 * uniqId attribute 媛믪쓣  由ы꽩?쒕떎.
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
	 * userTy attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUserTy() {
		return userTy;
	}
	/**
	 * userTy attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param userTy String
	 */
	public void setUserTy(String userTy) {
		this.userTy = userTy;
	}
	/**
	 * adres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdres() {
		return adres;
	}
	/**
	 * adres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param adres String
	 */
	public void setAdres(String adres) {
		this.adres = adres;
	}
	/**
	 * detailAdres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDetailAdres() {
		return detailAdres;
	}
	/**
	 * detailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param detailAdres String
	 */
	public void setDetailAdres(String detailAdres) {
		this.detailAdres = detailAdres;
	}
	/**
	 * applcntIhidnum attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getApplcntIhidnum() {
		return applcntIhidnum;
	}
	/**
	 * applcntIhidnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param applcntIhidnum String
	 */
	public void setApplcntIhidnum(String applcntIhidnum) {
		this.applcntIhidnum = applcntIhidnum;
	}
	/**
	 * applcntNm attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getApplcntNm() {
		return applcntNm;
	}
	/**
	 * applcntNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param applcntNm String
	 */
	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}
	/**
	 * bizrno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getBizrno() {
		return bizrno;
	}
	/**
	 * bizrno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param bizrno String
	 */
	public void setBizrno(String bizrno) {
		this.bizrno = bizrno;
	}
	/**
	 * cmpnyNm attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCmpnyNm() {
		return cmpnyNm;
	}
	/**
	 * cmpnyNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cmpnyNm String
	 */
	public void setCmpnyNm(String cmpnyNm) {
		this.cmpnyNm = cmpnyNm;
	}
	/**
	 * cxfc attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCxfc() {
		return cxfc;
	}
	/**
	 * cxfc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cxfc String
	 */
	public void setCxfc(String cxfc) {
		this.cxfc = cxfc;
	}
	/**
	 * entrprsmberId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsmberId() {
		return entrprsmberId;
	}
	/**
	 * entrprsmberId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsmberId String
	 */
	public void setEntrprsmberId(String entrprsmberId) {
		this.entrprsmberId = entrprsmberId;
	}
	/**
	 * entrprsMberPassword attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsMberPassword() {
		return entrprsMberPassword;
	}
	/**
	 * entrprsMberPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsMberPassword String
	 */
	public void setEntrprsMberPassword(String entrprsMberPassword) {
		this.entrprsMberPassword = entrprsMberPassword;
	}
	/**
	 * entrprsMberPasswordCnsr attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsMberPasswordCnsr() {
		return entrprsMberPasswordCnsr;
	}
	/**
	 * entrprsMberPasswordCnsr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsMberPasswordCnsr String
	 */
	public void setEntrprsMberPasswordCnsr(String entrprsMberPasswordCnsr) {
		this.entrprsMberPasswordCnsr = entrprsMberPasswordCnsr;
	}
	/**
	 * entrprsMberPasswordHint attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsMberPasswordHint() {
		return entrprsMberPasswordHint;
	}
	/**
	 * entrprsMberPasswordHint attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsMberPasswordHint String
	 */
	public void setEntrprsMberPasswordHint(String entrprsMberPasswordHint) {
		this.entrprsMberPasswordHint = entrprsMberPasswordHint;
	}
	/**
	 * entrprsMberSttus attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsMberSttus() {
		return entrprsMberSttus;
	}
	/**
	 * entrprsMberSttus attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsMberSttus String
	 */
	public void setEntrprsMberSttus(String entrprsMberSttus) {
		this.entrprsMberSttus = entrprsMberSttus;
	}
	/**
	 * entrprsSeCode attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsSeCode() {
		return entrprsSeCode;
	}
	/**
	 * entrprsSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsSeCode String
	 */
	public void setEntrprsSeCode(String entrprsSeCode) {
		this.entrprsSeCode = entrprsSeCode;
	}
	/**
	 * fxnum attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFxnum() {
		return fxnum;
	}
	/**
	 * fxnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param fxnum String
	 */
	public void setFxnum(String fxnum) {
		this.fxnum = fxnum;
	}
	/**
	 * groupId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getGroupId() {
		return groupId;
	}
	/**
	 * groupId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupId String
	 */
	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}
	/**
	 * indutyCode attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getIndutyCode() {
		return indutyCode;
	}
	/**
	 * indutyCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param indutyCode String
	 */
	public void setIndutyCode(String indutyCode) {
		this.indutyCode = indutyCode;
	}
	/**
	 * jurirno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getJurirno() {
		return jurirno;
	}
	/**
	 * jurirno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param jurirno String
	 */
	public void setJurirno(String jurirno) {
		this.jurirno = jurirno;
	}
	/**
	 * areaNo attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAreaNo() {
		return areaNo;
	}
	/**
	 * areaNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param areaNo String
	 */
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}
	/**
	 * entrprsEndTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsEndTelno() {
		return entrprsEndTelno;
	}
	/**
	 * entrprsEndTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsEndTelno String
	 */
	public void setEntrprsEndTelno(String entrprsEndTelno) {
		this.entrprsEndTelno = entrprsEndTelno;
	}
	/**
	 * entrprsMiddleTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEntrprsMiddleTelno() {
		return entrprsMiddleTelno;
	}
	/**
	 * entrprsMiddleTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param entrprsMiddleTelno String
	 */
	public void setEntrprsMiddleTelno(String entrprsMiddleTelno) {
		this.entrprsMiddleTelno = entrprsMiddleTelno;
	}
	/**
	 * sbscrbDe attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSbscrbDe() {
		return sbscrbDe;
	}
	/**
	 * sbscrbDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sbscrbDe String
	 */
	public void setSbscrbDe(String sbscrbDe) {
		this.sbscrbDe = sbscrbDe;
	}
	/**
	 * zip attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getZip() {
		return zip;
	}
	/**
	 * zip attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param zip String
	 */
	public void setZip(String zip) {
		this.zip = zip;
	}
	/**
	 * applcntEmailAdres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getApplcntEmailAdres() {
		return applcntEmailAdres;
	}
	/**
	 * applcntEmailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param applcntEmailAdres String
	 */
	public void setApplcntEmailAdres(String applcntEmailAdres) {
		this.applcntEmailAdres = applcntEmailAdres;
	}


}
