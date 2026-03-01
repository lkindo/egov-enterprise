package egovframework.com.uss.umt.service;

/**
 * ?쇰컲?뚯썝VO?대옒?ㅻ줈???쇰컲?뚯썝愿由?鍮꾩??덉뒪濡쒖쭅 泥섎━????ぉ??援ъ꽦?쒕떎.
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
public class MberManageVO extends UserDefaultVO{

	private static final long serialVersionUID = -4255594107023139972L;

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
	 * ?앹쟾?붾쾲??
	 */
	private String endTelno;
	/**
	 * ?⑹뒪踰덊샇
	 */
	private String mberFxnum;
	/**
	 * 洹몃９ ID
	 */
	private String groupId;
	/**
	 * 二쇰??깅줉踰덊샇
	 */
	private String ihidnum;
	/**
	 * ?깅퀎肄붾뱶
	 */
	private String sexdstnCode;
	/**
	 * ?뚯썝 ID
	 */
	private String mberId;
	/**
	 * ?뚯썝紐?
	 */
	private String mberNm;
	/**
	 * ?뚯썝?곹깭
	 */
	private String mberSttus;
	/**
	 * 吏??쾲??
	 */
	private String areaNo;
	/**
	 * 以묎컙?꾪솕踰덊샇
	 */
	private String middleTelno;
	/**
	 * ?몃뱶?곕쾲??
	 */
	private String moblphonNo;
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
	 * 媛???쇱옄
	 */
	private String sbscrbDe;
	/**
	 * ?고렪踰덊샇
	 */
	private String zip;
	/**
	 * ?대찓?쇱＜??
	 */
	private String mberEmailAdres;
	
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
	 * endTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEndTelno() {
		return endTelno;
	}
	/**
	 * endTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param endTelno String
	 */
	public void setEndTelno(String endTelno) {
		this.endTelno = endTelno;
	}
	/**
	 * mberFxnum attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberFxnum() {
		return mberFxnum;
	}
	/**
	 * mberFxnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberFxnum String
	 */
	public void setMberFxnum(String mberFxnum) {
		this.mberFxnum = mberFxnum;
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
	 * mberId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberId() {
		return mberId;
	}
	/**
	 * mberId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberId String
	 */
	public void setMberId(String mberId) {
		this.mberId = mberId;
	}
	/**
	 * mberNm attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberNm() {
		return mberNm;
	}
	/**
	 * mberNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberNm String
	 */
	public void setMberNm(String mberNm) {
		this.mberNm = mberNm;
	}
	/**
	 * mberSttus attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberSttus() {
		return mberSttus;
	}
	/**
	 * mberSttus attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberSttus String
	 */
	public void setMberSttus(String mberSttus) {
		this.mberSttus = mberSttus;
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
	 * middleTelno attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMiddleTelno() {
		return middleTelno;
	}
	/**
	 * middleTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param middleTelno String
	 */
	public void setMiddleTelno(String middleTelno) {
		this.middleTelno = middleTelno;
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
	 * mberEmailAdres attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMberEmailAdres() {
		return mberEmailAdres;
	}
	/**
	 * mberEmailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mberEmailAdres String
	 */
	public void setMberEmailAdres(String mberEmailAdres) {
		this.mberEmailAdres = mberEmailAdres;
	}

}
