package egovframework.com.uss.umt.service;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * ???????????????????????????????????????.
 * 
 * @author ???????? ???
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.10  ???         ????
 *   2017.07.21  ???			??????
 *
 *      </pre>
 **/
public class UserManageVO extends UserDefaultVO {

	private static final long serialVersionUID = 3640820362821490939L;

	/** ???????- ???????????**/
	private String oldPassword = "";

	/**
	 * ??
	 **/
	private String sbscrbDe;
	/**
	 * ?????????
	 **/
	private String uniqId = "";
	/**
	 * ??????
	 **/
	private String userTy;
	/**
	 * ????
	 **/
	private String areaNo;
	/**
	 * ??
	 **/
	private String brth;
	/**
	 * ???
	 **/
	private String detailAdres;
	/**
	 * ??????
	 **/
	@Email(message = "??     ???         ????   ?   ?? ??      ??      .")
	@Size(max = 50, message = "??     ??? 50????     ??   ???      ??")
	private String emailAdres;
	/**
	 * ????
	 **/
	private String emplNo;
	/**
	 * ?????ID
	 **/
	@NotBlank(message = "?????ID???          ??            ????      .")
	@Size(min = 4, max = 20, message = "?????ID??4~20???????   ???      ??")
	private String emplyrId;
	/**
	 * ??????
	 **/
	@NotBlank(message = "???????     ?? ?          ??            ????      .")
	@Size(max = 60, message = "??     ?? 60????     ??   ???      ??")
	private String emplyrNm;
	/**
	 * ??????
	 **/
	private String emplyrSttusCode;
	/**
	 * ????
	 **/
	private String fxnum;
	/**
	 * ?ID
	 **/
	private String groupId;
	/**
	 * ???
	 **/
	private String homeadres;
	/**
	 * ???
	 **/
	private String homeendTelno;
	/**
	 * ???
	 **/
	private String homemiddleTelno;
	/**
	 * ????
	 **/
	private String ihidnum;
	/**
	 * ??????
	 **/
	private String insttCode;
	/**
	 * ??????????
	 **/
	private String mberTy;
	/**
	 * ????
	 **/
	private String moblphonNo;
	/**
	 * ??
	 **/
	private String ofcpsNm;
	/**
	 * ???????
	 **/
	private String offmTelno;
	/**
	 * ?ID
	 **/
	private String orgnztId;
	/**
	 * ?????
	 **/
	@NotBlank(message = "??   ?         ????          ??            ????      .")
	@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[$@$!%*#?&])[A-Za-z\\d$@$!%*#?&]{8,}$", message = "??   ?         ????      ? ??     , ?     ?               ????   ??       8????      ??      ????      ??")
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
	 * ???????????
	 **/
	private String sbscrbDeBegin;
	/**
	 * ??????????
	 **/
	private String sbscrbDeEnd;
	/**
	 * ?
	 **/
	private String sexdstnCode;
	/**
	 * ???
	 **/
	private String zip;
	/**
	 * DN ?
	 **/
	private String subDn;

	private String lockAt;

	public String getLockAt() {
		return lockAt;
	}

	public void setLockAt(String lockAt) {
		this.lockAt = lockAt;
	}

	/**
	 * oldPassword attribute ??????.
	 * 
	 * @return String
	 **/
	public String getOldPassword() {
		return oldPassword;
	}

	/**
	 * oldPassword attribute ???????.
	 * 
	 * @param oldPassword String
	 **/
	public void setOldPassword(String oldPassword) {
		this.oldPassword = oldPassword;
	}

	/**
	 * sbscrbDe attribute ??????.
	 * 
	 * @return String
	 **/
	public String getSbscrbDe() {
		return sbscrbDe;
	}

	/**
	 * sbscrbDe attribute ???????.
	 * 
	 * @param sbscrbDe String
	 **/
	public void setSbscrbDe(String sbscrbDe) {
		this.sbscrbDe = sbscrbDe;
	}

	/**
	 * uniqId attribute ??????.
	 * 
	 * @return String
	 **/
	public String getUniqId() {
		return uniqId;
	}

	/**
	 * uniqId attribute ???????.
	 * 
	 * @param uniqId String
	 **/
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}

	/**
	 * userTy attribute ??????.
	 * 
	 * @return String
	 **/
	public String getUserTy() {
		return userTy;
	}

	/**
	 * userTy attribute ???????.
	 * 
	 * @param userTy String
	 **/
	public void setUserTy(String userTy) {
		this.userTy = userTy;
	}

	/**
	 * areaNo attribute ??????.
	 * 
	 * @return String
	 **/
	public String getAreaNo() {
		return areaNo;
	}

	/**
	 * areaNo attribute ???????.
	 * 
	 * @param areaNo String
	 **/
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}

	/**
	 * brth attribute ??????.
	 * 
	 * @return String
	 **/
	public String getBrth() {
		return brth;
	}

	/**
	 * brth attribute ???????.
	 * 
	 * @param brth String
	 **/
	public void setBrth(String brth) {
		this.brth = brth;
	}

	/**
	 * detailAdres attribute ??????.
	 * 
	 * @return String
	 **/
	public String getDetailAdres() {
		return detailAdres;
	}

	/**
	 * detailAdres attribute ???????.
	 * 
	 * @param detailAdres String
	 **/
	public void setDetailAdres(String detailAdres) {
		this.detailAdres = detailAdres;
	}

	/**
	 * emailAdres attribute ??????.
	 * 
	 * @return String
	 **/
	public String getEmailAdres() {
		return emailAdres;
	}

	/**
	 * emailAdres attribute ???????.
	 * 
	 * @param emailAdres String
	 **/
	public void setEmailAdres(String emailAdres) {
		this.emailAdres = emailAdres;
	}

	/**
	 * emplNo attribute ??????.
	 * 
	 * @return String
	 **/
	public String getEmplNo() {
		return emplNo;
	}

	/**
	 * emplNo attribute ???????.
	 * 
	 * @param emplNo String
	 **/
	public void setEmplNo(String emplNo) {
		this.emplNo = emplNo;
	}

	/**
	 * emplyrId attribute ??????.
	 * 
	 * @return String
	 **/
	public String getEmplyrId() {
		return emplyrId;
	}

	/**
	 * emplyrId attribute ???????.
	 * 
	 * @param emplyrId String
	 **/
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}

	/**
	 * emplyrNm attribute ??????.
	 * 
	 * @return String
	 **/
	public String getEmplyrNm() {
		return emplyrNm;
	}

	/**
	 * emplyrNm attribute ???????.
	 * 
	 * @param emplyrNm String
	 **/
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}

	/**
	 * emplyrSttusCode attribute ??????.
	 * 
	 * @return String
	 **/
	public String getEmplyrSttusCode() {
		return emplyrSttusCode;
	}

	/**
	 * emplyrSttusCode attribute ???????.
	 * 
	 * @param emplyrSttusCode String
	 **/
	public void setEmplyrSttusCode(String emplyrSttusCode) {
		this.emplyrSttusCode = emplyrSttusCode;
	}

	/**
	 * fxnum attribute ??????.
	 * 
	 * @return String
	 **/
	public String getFxnum() {
		return fxnum;
	}

	/**
	 * fxnum attribute ???????.
	 * 
	 * @param fxnum String
	 **/
	public void setFxnum(String fxnum) {
		this.fxnum = fxnum;
	}

	/**
	 * groupId attribute ??????.
	 * 
	 * @return String
	 **/
	public String getGroupId() {
		return groupId;
	}

	/**
	 * groupId attribute ???????.
	 * 
	 * @param groupId String
	 **/
	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}

	/**
	 * homeadres attribute ??????.
	 * 
	 * @return String
	 **/
	public String getHomeadres() {
		return homeadres;
	}

	/**
	 * homeadres attribute ???????.
	 * 
	 * @param homeadres String
	 **/
	public void setHomeadres(String homeadres) {
		this.homeadres = homeadres;
	}

	/**
	 * homeendTelno attribute ??????.
	 * 
	 * @return String
	 **/
	public String getHomeendTelno() {
		return homeendTelno;
	}

	/**
	 * homeendTelno attribute ???????.
	 * 
	 * @param homeendTelno String
	 **/
	public void setHomeendTelno(String homeendTelno) {
		this.homeendTelno = homeendTelno;
	}

	/**
	 * homemiddleTelno attribute ??????.
	 * 
	 * @return String
	 **/
	public String getHomemiddleTelno() {
		return homemiddleTelno;
	}

	/**
	 * homemiddleTelno attribute ???????.
	 * 
	 * @param homemiddleTelno String
	 **/
	public void setHomemiddleTelno(String homemiddleTelno) {
		this.homemiddleTelno = homemiddleTelno;
	}

	/**
	 * ihidnum attribute ??????.
	 * 
	 * @return String
	 **/
	public String getIhidnum() {
		return ihidnum;
	}

	/**
	 * ihidnum attribute ???????.
	 * 
	 * @param ihidnum String
	 **/
	public void setIhidnum(String ihidnum) {
		this.ihidnum = ihidnum;
	}

	/**
	 * insttCode attribute ??????.
	 * 
	 * @return String
	 **/
	public String getInsttCode() {
		return insttCode;
	}

	/**
	 * insttCode attribute ???????.
	 * 
	 * @param insttCode String
	 **/
	public void setInsttCode(String insttCode) {
		this.insttCode = insttCode;
	}

	/**
	 * mberTy attribute ??????.
	 * 
	 * @return String
	 **/
	public String getMberTy() {
		return mberTy;
	}

	/**
	 * mberTy attribute ???????.
	 * 
	 * @param mberTy String
	 **/
	public void setMberTy(String mberTy) {
		this.mberTy = mberTy;
	}

	/**
	 * moblphonNo attribute ??????.
	 * 
	 * @return String
	 **/
	public String getMoblphonNo() {
		return moblphonNo;
	}

	/**
	 * moblphonNo attribute ???????.
	 * 
	 * @param moblphonNo String
	 **/
	public void setMoblphonNo(String moblphonNo) {
		this.moblphonNo = moblphonNo;
	}

	/**
	 * ofcpsNm attribute ??????.
	 * 
	 * @return String
	 **/
	public String getOfcpsNm() {
		return ofcpsNm;
	}

	/**
	 * ofcpsNm attribute ???????.
	 * 
	 * @param ofcpsNm String
	 **/
	public void setOfcpsNm(String ofcpsNm) {
		this.ofcpsNm = ofcpsNm;
	}

	/**
	 * offmTelno attribute ??????.
	 * 
	 * @return String
	 **/
	public String getOffmTelno() {
		return offmTelno;
	}

	/**
	 * offmTelno attribute ???????.
	 * 
	 * @param offmTelno String
	 **/
	public void setOffmTelno(String offmTelno) {
		this.offmTelno = offmTelno;
	}

	/**
	 * orgnztId attribute ??????.
	 * 
	 * @return String
	 **/
	public String getOrgnztId() {
		return orgnztId;
	}

	/**
	 * orgnztId attribute ???????.
	 * 
	 * @param orgnztId String
	 **/
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}

	/**
	 * password attribute ??????.
	 * 
	 * @return String
	 **/
	public String getPassword() {
		return password;
	}

	/**
	 * password attribute ???????.
	 * 
	 * @param password String
	 **/
	public void setPassword(String password) {
		this.password = password;
	}

	/**
	 * passwordCnsr attribute ??????.
	 * 
	 * @return String
	 **/
	public String getPasswordCnsr() {
		return passwordCnsr;
	}

	/**
	 * passwordCnsr attribute ???????.
	 * 
	 * @param passwordCnsr String
	 **/
	public void setPasswordCnsr(String passwordCnsr) {
		this.passwordCnsr = passwordCnsr;
	}

	/**
	 * passwordHint attribute ??????.
	 * 
	 * @return String
	 **/
	public String getPasswordHint() {
		return passwordHint;
	}

	/**
	 * passwordHint attribute ???????.
	 * 
	 * @param passwordHint String
	 **/
	public void setPasswordHint(String passwordHint) {
		this.passwordHint = passwordHint;
	}

	/**
	 * sbscrbDeBegin attribute ??????.
	 * 
	 * @return String
	 **/
	public String getSbscrbDeBegin() {
		return sbscrbDeBegin;
	}

	/**
	 * sbscrbDeBegin attribute ???????.
	 * 
	 * @param sbscrbDeBegin String
	 **/
	public void setSbscrbDeBegin(String sbscrbDeBegin) {
		this.sbscrbDeBegin = sbscrbDeBegin;
	}

	/**
	 * sbscrbDeEnd attribute ??????.
	 * 
	 * @return String
	 **/
	public String getSbscrbDeEnd() {
		return sbscrbDeEnd;
	}

	/**
	 * sbscrbDeEnd attribute ???????.
	 * 
	 * @param sbscrbDeEnd String
	 **/
	public void setSbscrbDeEnd(String sbscrbDeEnd) {
		this.sbscrbDeEnd = sbscrbDeEnd;
	}

	/**
	 * sexdstnCode attribute ??????.
	 * 
	 * @return String
	 **/
	public String getSexdstnCode() {
		return sexdstnCode;
	}

	/**
	 * sexdstnCode attribute ???????.
	 * 
	 * @param sexdstnCode String
	 **/
	public void setSexdstnCode(String sexdstnCode) {
		this.sexdstnCode = sexdstnCode;
	}

	/**
	 * zip attribute ??????.
	 * 
	 * @return String
	 **/
	public String getZip() {
		return zip;
	}

	/**
	 * zip attribute ???????.
	 * 
	 * @param zip String
	 **/
	public void setZip(String zip) {
		this.zip = zip;
	}

	/**
	 * subDn attribute ??????.
	 * 
	 * @return String
	 **/
	public String getSubDn() {
		return subDn;
	}

	/**
	 * subDn attribute ???????.
	 * 
	 * @param subDn String
	 **/
	public void setSubDn(String subDn) {
		this.subDn = subDn;
	}

}
