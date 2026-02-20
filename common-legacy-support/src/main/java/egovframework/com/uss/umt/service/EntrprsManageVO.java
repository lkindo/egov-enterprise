package egovframework.com.uss.umt.service;

/**
 * ???VO??????????????????????????????.
 * @author ???????? ???
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.10  ???         ????
 *   2017.07.21  ???			??????
 *
 * </pre>
 **/
public class EntrprsManageVO  extends UserDefaultVO{

	private static final long serialVersionUID = -6532736688851136256L;

	/** ???????- ???????????*/
    private String oldPassword = "";

    /**
	 * ?????????
	 **/
	private String uniqId="";
	/**
	 * ??????
	 **/
	private String userTy;
	/**
	 * ??
	 **/
	private String adres;
	/**
	 * ???
	 **/
	private String detailAdres;
	/**
	 * ???????
	 **/
	private String applcntIhidnum;
	/**
	 * ????
	 **/
	private String applcntNm;
	/**
	 * ??????
	 **/
	private String bizrno;
	/**
	 * ????
	 **/
	private String cmpnyNm;
	/**
	 * ??????
	 **/
	private String cxfc;
	/**
	 * ???? ID
	 **/
	private String entrprsmberId;
	/**
	 * ???? ?????
	 **/
	private String entrprsMberPassword;
	/**
	 * ???? ??????
	 **/
	private String entrprsMberPasswordCnsr;
	/**
	 * ???? ???????
	 **/
	private String entrprsMberPasswordHint;
	/**
	 * ???? ?
	 **/
	private String entrprsMberSttus;
	/**
	 * ??
	 **/
	private String entrprsSeCode;
	/**
	 * ????
	 **/
	private String fxnum;
	/**
	 * ?ID
	 **/
	private String groupId;
	/**
	 * ????
	 **/
	private String indutyCode;
	/**
	 * ????
	 **/
	private String jurirno;
	/**
	 * ????
	 **/
	private String areaNo;
	/**
	 * ????????
	 **/
	private String entrprsEndTelno;
	/**
	 * ??????
	 **/
	private String entrprsMiddleTelno;
	/**
	 * ????
	 **/
	private String sbscrbDe;
	/**
	 * ???
	 **/
	private String zip;
	/**
	 * ?????????
	 **/
	private String applcntEmailAdres;
	
	private String lockAt;
	public String getLockAt() {return lockAt;}
	public void setLockAt(String lockAt) {this.lockAt = lockAt;}
	
	/**
	 * oldPassword attribute ??? ???.
	 * @return String
	 **/
	public String getOldPassword() {
		return oldPassword;
	}
	/**
	 * oldPassword attribute ???????.
	 * @param oldPassword String
	 **/
	public void setOldPassword(String oldPassword) {
		this.oldPassword = oldPassword;
	}
	/**
	 * uniqId attribute ??? ???.
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
	/**
	 * userTy attribute ??? ???.
	 * @return String
	 **/
	public String getUserTy() {
		return userTy;
	}
	/**
	 * userTy attribute ???????.
	 * @param userTy String
	 **/
	public void setUserTy(String userTy) {
		this.userTy = userTy;
	}
	/**
	 * adres attribute ??? ???.
	 * @return String
	 **/
	public String getAdres() {
		return adres;
	}
	/**
	 * adres attribute ???????.
	 * @param adres String
	 **/
	public void setAdres(String adres) {
		this.adres = adres;
	}
	/**
	 * detailAdres attribute ??? ???.
	 * @return String
	 **/
	public String getDetailAdres() {
		return detailAdres;
	}
	/**
	 * detailAdres attribute ???????.
	 * @param detailAdres String
	 **/
	public void setDetailAdres(String detailAdres) {
		this.detailAdres = detailAdres;
	}
	/**
	 * applcntIhidnum attribute ??? ???.
	 * @return String
	 **/
	public String getApplcntIhidnum() {
		return applcntIhidnum;
	}
	/**
	 * applcntIhidnum attribute ???????.
	 * @param applcntIhidnum String
	 **/
	public void setApplcntIhidnum(String applcntIhidnum) {
		this.applcntIhidnum = applcntIhidnum;
	}
	/**
	 * applcntNm attribute ??? ???.
	 * @return String
	 **/
	public String getApplcntNm() {
		return applcntNm;
	}
	/**
	 * applcntNm attribute ???????.
	 * @param applcntNm String
	 **/
	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}
	/**
	 * bizrno attribute ??? ???.
	 * @return String
	 **/
	public String getBizrno() {
		return bizrno;
	}
	/**
	 * bizrno attribute ???????.
	 * @param bizrno String
	 **/
	public void setBizrno(String bizrno) {
		this.bizrno = bizrno;
	}
	/**
	 * cmpnyNm attribute ??? ???.
	 * @return String
	 **/
	public String getCmpnyNm() {
		return cmpnyNm;
	}
	/**
	 * cmpnyNm attribute ???????.
	 * @param cmpnyNm String
	 **/
	public void setCmpnyNm(String cmpnyNm) {
		this.cmpnyNm = cmpnyNm;
	}
	/**
	 * cxfc attribute ??? ???.
	 * @return String
	 **/
	public String getCxfc() {
		return cxfc;
	}
	/**
	 * cxfc attribute ???????.
	 * @param cxfc String
	 **/
	public void setCxfc(String cxfc) {
		this.cxfc = cxfc;
	}
	/**
	 * entrprsmberId attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsmberId() {
		return entrprsmberId;
	}
	/**
	 * entrprsmberId attribute ???????.
	 * @param entrprsmberId String
	 **/
	public void setEntrprsmberId(String entrprsmberId) {
		this.entrprsmberId = entrprsmberId;
	}
	/**
	 * entrprsMberPassword attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsMberPassword() {
		return entrprsMberPassword;
	}
	/**
	 * entrprsMberPassword attribute ???????.
	 * @param entrprsMberPassword String
	 **/
	public void setEntrprsMberPassword(String entrprsMberPassword) {
		this.entrprsMberPassword = entrprsMberPassword;
	}
	/**
	 * entrprsMberPasswordCnsr attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsMberPasswordCnsr() {
		return entrprsMberPasswordCnsr;
	}
	/**
	 * entrprsMberPasswordCnsr attribute ???????.
	 * @param entrprsMberPasswordCnsr String
	 **/
	public void setEntrprsMberPasswordCnsr(String entrprsMberPasswordCnsr) {
		this.entrprsMberPasswordCnsr = entrprsMberPasswordCnsr;
	}
	/**
	 * entrprsMberPasswordHint attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsMberPasswordHint() {
		return entrprsMberPasswordHint;
	}
	/**
	 * entrprsMberPasswordHint attribute ???????.
	 * @param entrprsMberPasswordHint String
	 **/
	public void setEntrprsMberPasswordHint(String entrprsMberPasswordHint) {
		this.entrprsMberPasswordHint = entrprsMberPasswordHint;
	}
	/**
	 * entrprsMberSttus attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsMberSttus() {
		return entrprsMberSttus;
	}
	/**
	 * entrprsMberSttus attribute ???????.
	 * @param entrprsMberSttus String
	 **/
	public void setEntrprsMberSttus(String entrprsMberSttus) {
		this.entrprsMberSttus = entrprsMberSttus;
	}
	/**
	 * entrprsSeCode attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsSeCode() {
		return entrprsSeCode;
	}
	/**
	 * entrprsSeCode attribute ???????.
	 * @param entrprsSeCode String
	 **/
	public void setEntrprsSeCode(String entrprsSeCode) {
		this.entrprsSeCode = entrprsSeCode;
	}
	/**
	 * fxnum attribute ??? ???.
	 * @return String
	 **/
	public String getFxnum() {
		return fxnum;
	}
	/**
	 * fxnum attribute ???????.
	 * @param fxnum String
	 **/
	public void setFxnum(String fxnum) {
		this.fxnum = fxnum;
	}
	/**
	 * groupId attribute ??? ???.
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
	 * indutyCode attribute ??? ???.
	 * @return String
	 **/
	public String getIndutyCode() {
		return indutyCode;
	}
	/**
	 * indutyCode attribute ???????.
	 * @param indutyCode String
	 **/
	public void setIndutyCode(String indutyCode) {
		this.indutyCode = indutyCode;
	}
	/**
	 * jurirno attribute ??? ???.
	 * @return String
	 **/
	public String getJurirno() {
		return jurirno;
	}
	/**
	 * jurirno attribute ???????.
	 * @param jurirno String
	 **/
	public void setJurirno(String jurirno) {
		this.jurirno = jurirno;
	}
	/**
	 * areaNo attribute ??? ???.
	 * @return String
	 **/
	public String getAreaNo() {
		return areaNo;
	}
	/**
	 * areaNo attribute ???????.
	 * @param areaNo String
	 **/
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}
	/**
	 * entrprsEndTelno attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsEndTelno() {
		return entrprsEndTelno;
	}
	/**
	 * entrprsEndTelno attribute ???????.
	 * @param entrprsEndTelno String
	 **/
	public void setEntrprsEndTelno(String entrprsEndTelno) {
		this.entrprsEndTelno = entrprsEndTelno;
	}
	/**
	 * entrprsMiddleTelno attribute ??? ???.
	 * @return String
	 **/
	public String getEntrprsMiddleTelno() {
		return entrprsMiddleTelno;
	}
	/**
	 * entrprsMiddleTelno attribute ???????.
	 * @param entrprsMiddleTelno String
	 **/
	public void setEntrprsMiddleTelno(String entrprsMiddleTelno) {
		this.entrprsMiddleTelno = entrprsMiddleTelno;
	}
	/**
	 * sbscrbDe attribute ??? ???.
	 * @return String
	 **/
	public String getSbscrbDe() {
		return sbscrbDe;
	}
	/**
	 * sbscrbDe attribute ???????.
	 * @param sbscrbDe String
	 **/
	public void setSbscrbDe(String sbscrbDe) {
		this.sbscrbDe = sbscrbDe;
	}
	/**
	 * zip attribute ??? ???.
	 * @return String
	 **/
	public String getZip() {
		return zip;
	}
	/**
	 * zip attribute ???????.
	 * @param zip String
	 **/
	public void setZip(String zip) {
		this.zip = zip;
	}
	/**
	 * applcntEmailAdres attribute ??? ???.
	 * @return String
	 **/
	public String getApplcntEmailAdres() {
		return applcntEmailAdres;
	}
	/**
	 * applcntEmailAdres attribute ???????.
	 * @param applcntEmailAdres String
	 **/
	public void setApplcntEmailAdres(String applcntEmailAdres) {
		this.applcntEmailAdres = applcntEmailAdres;
	}


}
