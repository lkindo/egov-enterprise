package egovframework.com.uss.umt.service;

/**
 * ?낅Т?ъ슜?륷O?대옒?ㅻ줈???낅Т?ъ슜?먭?由?鍮꾩??덉뒪濡쒖쭅 泥섎━????ぉ??援ъ꽦?쒕떎.
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
public class UserManageVO extends UserDefaultVO{

	private static final long serialVersionUID = 3640820362821490939L;

	/** ?댁쟾鍮꾨?踰덊샇 - 鍮꾨?踰덊샇 蹂寃쎌떆 ?ъ슜*/
    private String oldPassword = "";

    /**
	 * 媛?낆씪
	 */
	private String sbscrbDe;
	/**
	 * ?ъ슜?먭퀬?좎븘?대뵒
	 */
	private String uniqId="";
	/**
	 * ?ъ슜???좏삎
	 */
	private String userTy;
	/**
	 * 吏??쾲??
	 */
	private String areaNo;
	/**
	 * ?앹씪
	 */
	private String brth;
	/**
	 * ?곸꽭二쇱냼
	 */
	private String detailAdres;
	/**
	 * ?대찓?쇱＜??
	 */
	private String emailAdres;
	/**
	 * ?ъ썝踰덊샇
	 */
	private String emplNo;
	/**
	 * ?ъ슜??ID
	 */
	private String emplyrId;
	/**
	 * ?ъ슜??紐?
	 */
	private String emplyrNm;
	/**
	 * ?ъ슜???곹깭
	 */
	private String emplyrSttusCode;
	/**
	 * ?⑹뒪踰덊샇
	 */
	private String fxnum;
	/**
	 * 洹몃９ ID
	 */
	private String groupId;
	/**
	 * 吏?二쇱냼
	 */
	private String homeadres;
	/**
	 * 吏묐걹?꾪솕踰덊샇
	 */
	private String homeendTelno;
	/**
	 * 吏묒쨷媛꾩쟾?붾쾲??
	 */
	private String homemiddleTelno;
	/**
	 * 二쇰??깅줉踰덊샇
	 */
	private String ihidnum;
	/**
	 * ?뚯냽湲곌?肄붾뱶
	 */
	private String insttCode;
	/**
	 * 寃?됱“嫄??뚯썝???
	 */
	private String mberTy;
	/**
	 * ?몃뱶?곕쾲??
	 */
	private String moblphonNo;
	/**
	 * 吏곸쐞紐?
	 */
	private String ofcpsNm;
	/**
	 * ?щТ?ㅼ쟾?붾쾲??
	 */
	private String offmTelno;
	/**
	 * 議곗쭅 ID
	 */
	private String orgnztId;
	/**
	 * 鍮꾨?踰덊샇
	 */
	private String password;
	/**
	 * 鍮꾨?踰덊샇 ?뺣떟
	 */
	private String passwordCnsr;
	/**
	 * 鍮꾨?踰덊샇 ?뚰듃
	 */
	private String passwordHint;
	/**
	 * 寃?됱“嫄?媛?낆씪???쒖옉??
	 */
	private String sbscrbDeBegin;
	/**
	 * 寃?됱“嫄?媛?낆씪??醫낅즺??
	 */
	private String sbscrbDeEnd;
	/**
	 * ?깅퀎肄붾뱶
	 */
	private String sexdstnCode;
	/**
	 * ?고렪踰덊샇
	 */
	private String zip;
	/**
	 * DN 媛?
	 */
	private String subDn;
	
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
	 * brth attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getBrth() {
		return brth;
	}
	/**
	 * brth attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param brth String
	 */
	public void setBrth(String brth) {
		this.brth = brth;
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
	 * emailAdres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmailAdres() {
		return emailAdres;
	}
	/**
	 * emailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emailAdres String
	 */
	public void setEmailAdres(String emailAdres) {
		this.emailAdres = emailAdres;
	}
	/**
	 * emplNo attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmplNo() {
		return emplNo;
	}
	/**
	 * emplNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emplNo String
	 */
	public void setEmplNo(String emplNo) {
		this.emplNo = emplNo;
	}
	/**
	 * emplyrId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmplyrId() {
		return emplyrId;
	}
	/**
	 * emplyrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emplyrId String
	 */
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}
	/**
	 * emplyrNm attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmplyrNm() {
		return emplyrNm;
	}
	/**
	 * emplyrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emplyrNm String
	 */
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}
	/**
	 * emplyrSttusCode attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmplyrSttusCode() {
		return emplyrSttusCode;
	}
	/**
	 * emplyrSttusCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emplyrSttusCode String
	 */
	public void setEmplyrSttusCode(String emplyrSttusCode) {
		this.emplyrSttusCode = emplyrSttusCode;
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
	 * homeadres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getHomeadres() {
		return homeadres;
	}
	/**
	 * homeadres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param homeadres String
	 */
	public void setHomeadres(String homeadres) {
		this.homeadres = homeadres;
	}
	/**
	 * homeendTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getHomeendTelno() {
		return homeendTelno;
	}
	/**
	 * homeendTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param homeendTelno String
	 */
	public void setHomeendTelno(String homeendTelno) {
		this.homeendTelno = homeendTelno;
	}
	/**
	 * homemiddleTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getHomemiddleTelno() {
		return homemiddleTelno;
	}
	/**
	 * homemiddleTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param homemiddleTelno String
	 */
	public void setHomemiddleTelno(String homemiddleTelno) {
		this.homemiddleTelno = homemiddleTelno;
	}
	/**
	 * ihidnum attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getIhidnum() {
		return ihidnum;
	}
	/**
	 * ihidnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ihidnum String
	 */
	public void setIhidnum(String ihidnum) {
		this.ihidnum = ihidnum;
	}
	/**
	 * insttCode attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttCode() {
		return insttCode;
	}
	/**
	 * insttCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttCode String
	 */
	public void setInsttCode(String insttCode) {
		this.insttCode = insttCode;
	}
	/**
	 * mberTy attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberTy() {
		return mberTy;
	}
	/**
	 * mberTy attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberTy String
	 */
	public void setMberTy(String mberTy) {
		this.mberTy = mberTy;
	}
	/**
	 * moblphonNo attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMoblphonNo() {
		return moblphonNo;
	}
	/**
	 * moblphonNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param moblphonNo String
	 */
	public void setMoblphonNo(String moblphonNo) {
		this.moblphonNo = moblphonNo;
	}
	/**
	 * ofcpsNm attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOfcpsNm() {
		return ofcpsNm;
	}
	/**
	 * ofcpsNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ofcpsNm String
	 */
	public void setOfcpsNm(String ofcpsNm) {
		this.ofcpsNm = ofcpsNm;
	}
	/**
	 * offmTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOffmTelno() {
		return offmTelno;
	}
	/**
	 * offmTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param offmTelno String
	 */
	public void setOffmTelno(String offmTelno) {
		this.offmTelno = offmTelno;
	}
	/**
	 * orgnztId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOrgnztId() {
		return orgnztId;
	}
	/**
	 * orgnztId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param orgnztId String
	 */
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	/**
	 * password attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPassword() {
		return password;
	}
	/**
	 * password attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param password String
	 */
	public void setPassword(String password) {
		this.password = password;
	}
	/**
	 * passwordCnsr attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPasswordCnsr() {
		return passwordCnsr;
	}
	/**
	 * passwordCnsr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param passwordCnsr String
	 */
	public void setPasswordCnsr(String passwordCnsr) {
		this.passwordCnsr = passwordCnsr;
	}
	/**
	 * passwordHint attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPasswordHint() {
		return passwordHint;
	}
	/**
	 * passwordHint attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param passwordHint String
	 */
	public void setPasswordHint(String passwordHint) {
		this.passwordHint = passwordHint;
	}
	/**
	 * sbscrbDeBegin attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSbscrbDeBegin() {
		return sbscrbDeBegin;
	}
	/**
	 * sbscrbDeBegin attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sbscrbDeBegin String
	 */
	public void setSbscrbDeBegin(String sbscrbDeBegin) {
		this.sbscrbDeBegin = sbscrbDeBegin;
	}
	/**
	 * sbscrbDeEnd attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSbscrbDeEnd() {
		return sbscrbDeEnd;
	}
	/**
	 * sbscrbDeEnd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sbscrbDeEnd String
	 */
	public void setSbscrbDeEnd(String sbscrbDeEnd) {
		this.sbscrbDeEnd = sbscrbDeEnd;
	}
	/**
	 * sexdstnCode attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSexdstnCode() {
		return sexdstnCode;
	}
	/**
	 * sexdstnCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sexdstnCode String
	 */
	public void setSexdstnCode(String sexdstnCode) {
		this.sexdstnCode = sexdstnCode;
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
	 * subDn attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSubDn() {
		return subDn;
	}
	/**
	 * subDn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param subDn String
	 */
	public void setSubDn(String subDn) {
		this.subDn = subDn;
	}

}
