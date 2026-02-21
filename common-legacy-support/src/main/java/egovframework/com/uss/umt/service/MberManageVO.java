package egovframework.com.uss.umt.service;

/**
 * ?????VO????????????????????????????????.
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
public class MberManageVO extends UserDefaultVO{

	private static final long serialVersionUID = -4255594107023139972L;

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
	 * ?????
	 **/
	private String endTelno;
	/**
	 * ????
	 **/
	private String mberFxnum;
	/**
	 * ?ID
	 **/
	private String groupId;
	/**
	 * ????
	 **/
	private String ihidnum;
	/**
	 * ?
	 **/
	private String sexdstnCode;
	/**
	 * ??? ID
	 **/
	private String mberId;
	/**
	 * ????
	 **/
	private String mberNm;
	/**
	 * ????
	 **/
	private String mberSttus;
	/**
	 * ????
	 **/
	private String areaNo;
	/**
	 * ???
	 **/
	private String middleTelno;
	/**
	 * ????
	 **/
	private String moblphonNo;
	/**
	 * ?????
	 **/
	private String password;
	/**
	 * ??????
	 **/
	private String passwordCnsr;
	/**
	 * ???????
	 **/
	private String passwordHint;
	/**
	 * ????
	 **/
	private String sbscrbDe;
	/**
	 * ???
	 **/
	private String zip;
	/**
	 * ??????
	 **/
	private String mberEmailAdres;
	
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
	 * endTelno attribute ??? ???.
	 * @return String
	 **/
	public String getEndTelno() {
		return endTelno;
	}
	/**
	 * endTelno attribute ???????.
	 * @param endTelno String
	 **/
	public void setEndTelno(String endTelno) {
		this.endTelno = endTelno;
	}
	/**
	 * mberFxnum attribute ??? ???.
	 * @return String
	 **/
	public String getMberFxnum() {
		return mberFxnum;
	}
	/**
	 * mberFxnum attribute ???????.
	 * @param mberFxnum String
	 **/
	public void setMberFxnum(String mberFxnum) {
		this.mberFxnum = mberFxnum;
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
	 * ihidnum attribute ??? ???.
	 * @return String
	 **/
	public String getIhidnum() {
		return ihidnum;
	}
	/**
	 * ihidnum attribute ???????.
	 * @param ihidnum String
	 **/
	public void setIhidnum(String ihidnum) {
		this.ihidnum = ihidnum;
	}
	/**
	 * sexdstnCode attribute ??? ???.
	 * @return String
	 **/
	public String getSexdstnCode() {
		return sexdstnCode;
	}
	/**
	 * sexdstnCode attribute ???????.
	 * @param sexdstnCode String
	 **/
	public void setSexdstnCode(String sexdstnCode) {
		this.sexdstnCode = sexdstnCode;
	}
	/**
	 * mberId attribute ??? ???.
	 * @return String
	 **/
	public String getMberId() {
		return mberId;
	}
	/**
	 * mberId attribute ???????.
	 * @param mberId String
	 **/
	public void setMberId(String mberId) {
		this.mberId = mberId;
	}
	/**
	 * mberNm attribute ??? ???.
	 * @return String
	 **/
	public String getMberNm() {
		return mberNm;
	}
	/**
	 * mberNm attribute ???????.
	 * @param mberNm String
	 **/
	public void setMberNm(String mberNm) {
		this.mberNm = mberNm;
	}
	/**
	 * mberSttus attribute ??? ???.
	 * @return String
	 **/
	public String getMberSttus() {
		return mberSttus;
	}
	/**
	 * mberSttus attribute ???????.
	 * @param mberSttus String
	 **/
	public void setMberSttus(String mberSttus) {
		this.mberSttus = mberSttus;
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
	 * middleTelno attribute ??? ???.
	 * @return String
	 **/
	public String getMiddleTelno() {
		return middleTelno;
	}
	/**
	 * middleTelno attribute ???????.
	 * @param middleTelno String
	 **/
	public void setMiddleTelno(String middleTelno) {
		this.middleTelno = middleTelno;
	}
	/**
	 * moblphonNo attribute ??? ???.
	 * @return String
	 **/
	public String getMoblphonNo() {
		return moblphonNo;
	}
	/**
	 * moblphonNo attribute ???????.
	 * @param moblphonNo String
	 **/
	public void setMoblphonNo(String moblphonNo) {
		this.moblphonNo = moblphonNo;
	}
	/**
	 * password attribute ??? ???.
	 * @return String
	 **/
	public String getPassword() {
		return password;
	}
	/**
	 * password attribute ???????.
	 * @param password String
	 **/
	public void setPassword(String password) {
		this.password = password;
	}
	/**
	 * passwordCnsr attribute ??? ???.
	 * @return String
	 **/
	public String getPasswordCnsr() {
		return passwordCnsr;
	}
	/**
	 * passwordCnsr attribute ???????.
	 * @param passwordCnsr String
	 **/
	public void setPasswordCnsr(String passwordCnsr) {
		this.passwordCnsr = passwordCnsr;
	}
	/**
	 * passwordHint attribute ??? ???.
	 * @return String
	 **/
	public String getPasswordHint() {
		return passwordHint;
	}
	/**
	 * passwordHint attribute ???????.
	 * @param passwordHint String
	 **/
	public void setPasswordHint(String passwordHint) {
		this.passwordHint = passwordHint;
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
	 * mberEmailAdres attribute ??? ???.
	 * @return String
	 **/
	public String getMberEmailAdres() {
		return mberEmailAdres;
	}
	/**
	 * mberEmailAdres attribute ???????.
	 * @param mberEmailAdres String
	 **/
	public void setMberEmailAdres(String mberEmailAdres) {
		this.mberEmailAdres = mberEmailAdres;
	}

}
