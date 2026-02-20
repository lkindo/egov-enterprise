package egovframework.com.cop.smt.lsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 媛꾨??쇱젙?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쇱젙ID, ?쇱젙援щ텇, ?쇱젙紐? ?쇱젙?댁슜, ?쇱젙?μ냼, 媛꾨?ID, 諛섎났援щ텇肄붾뱶, ?쇱젙?쒖옉?쇱옄, ?쇱젙醫낅즺?쇱옄, ?쇱젙?대떦?륤D ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:06
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class LeaderSchdul  implements Serializable{

	/** ?쇱젙ID */
	private String schdulId;
	/** ?쇱젙援щ텇 */
	private String schdulSe;
	/** ?쇱젙紐?*/
	private String schdulNm;
	/** ?쇱젙?댁슜 */
	private String schdulCn;
	/** ?쇱젙?μ냼 */
	private String schdulPlace;
	/** 媛꾨?ID */
	private String leaderId;
	/** 媛꾨?紐?*/
	private String leaderName;
	/** 諛섎났援щ텇肄붾뱶 */
	private String reptitSeCode;
	/** ?쇱젙?쇱옄 */
	private String schdulDe;
	/** ?쇱젙?쒖옉?쇱옄 */
	private String schdulBgnDe;
	/** ?쇱젙醫낅즺?쇱옄 */
	private String schdulEndDe;
	/** ?쇱젙?대떦?륤D */
	private String schdulChargerId;
	/** ?쇱젙?대떦?먮챸 */
	private String schdulChargerName;
	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";
	
	/** ?쇱젙?쒖옉?쇱옄(?쒓컙) */
	private String schdulBgndeHH = "";
	
	/** ?쇱젙?쒖옉?쇱옄(遺? */
	private String schdulBgndeMM = "";
	
	/** ?쇱젙醫낅즺?쇱옄(?쒓컙) */
	private String schdulEnddeHH = "";
	
	/** ?쇱젙醫낅즺?쇱옄(遺? */
	private String schdulEnddeMM = "";
	
	/** ?쇱젙?쒖옉?쇱옄(Year/Month/Day) */
	private String schdulBgndeYYYMMDD = "";
	
	/** ?쇱젙醫낅즺?쇱옄(Year/Month/Day) */
	private String schdulEnddeYYYMMDD = "";

	public String getSchdulId() {
		return schdulId;
	}

	public void setSchdulId(String schdulId) {
		this.schdulId = schdulId;
	}

	public String getSchdulSe() {
		return schdulSe;
	}

	public void setSchdulSe(String schdulSe) {
		this.schdulSe = schdulSe;
	}

	public String getSchdulNm() {
		return schdulNm;
	}

	public void setSchdulNm(String schdulNm) {
		this.schdulNm = schdulNm;
	}

	public String getSchdulCn() {
		return schdulCn;
	}

	public void setSchdulCn(String schdulCn) {
		this.schdulCn = schdulCn;
	}

	public String getSchdulPlace() {
		return schdulPlace;
	}

	public void setSchdulPlace(String schdulPlace) {
		this.schdulPlace = schdulPlace;
	}

	public String getLeaderId() {
		return leaderId;
	}

	public void setLeaderId(String leaderId) {
		this.leaderId = leaderId;
	}

	public String getLeaderName() {
		return leaderName;
	}

	public void setLeaderName(String leaderName) {
		this.leaderName = leaderName;
	}

	public String getReptitSeCode() {
		return reptitSeCode;
	}

	public void setReptitSeCode(String reptitSeCode) {
		this.reptitSeCode = reptitSeCode;
	}

	public String getSchdulDe() {
		return schdulDe;
	}

	public void setSchdulDe(String schdulDe) {
		this.schdulDe = schdulDe;
	}

	public String getSchdulBgnDe() {
		return schdulBgnDe;
	}

	public void setSchdulBgnDe(String schdulBgnDe) {
		this.schdulBgnDe = schdulBgnDe;
	}

	public String getSchdulEndDe() {
		return schdulEndDe;
	}

	public void setSchdulEndDe(String schdulEndDe) {
		this.schdulEndDe = schdulEndDe;
	}

	public String getSchdulChargerId() {
		return schdulChargerId;
	}

	public void setSchdulChargerId(String schdulChargerId) {
		this.schdulChargerId = schdulChargerId;
	}

	public String getSchdulChargerName() {
		return schdulChargerName;
	}

	public void setSchdulChargerName(String schdulChargerName) {
		this.schdulChargerName = schdulChargerName;
	}

	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	public String getSchdulBgndeHH() {
		return schdulBgndeHH;
	}

	public void setSchdulBgndeHH(String schdulBgndeHH) {
		this.schdulBgndeHH = schdulBgndeHH;
	}

	public String getSchdulBgndeMM() {
		return schdulBgndeMM;
	}

	public void setSchdulBgndeMM(String schdulBgndeMM) {
		this.schdulBgndeMM = schdulBgndeMM;
	}

	public String getSchdulEnddeHH() {
		return schdulEnddeHH;
	}

	public void setSchdulEnddeHH(String schdulEnddeHH) {
		this.schdulEnddeHH = schdulEnddeHH;
	}

	public String getSchdulEnddeMM() {
		return schdulEnddeMM;
	}

	public void setSchdulEnddeMM(String schdulEnddeMM) {
		this.schdulEnddeMM = schdulEnddeMM;
	}

	public String getSchdulBgndeYYYMMDD() {
		return schdulBgndeYYYMMDD;
	}

	public void setSchdulBgndeYYYMMDD(String schdulBgndeYYYMMDD) {
		this.schdulBgndeYYYMMDD = schdulBgndeYYYMMDD;
	}

	public String getSchdulEnddeYYYMMDD() {
		return schdulEnddeYYYMMDD;
	}

	public void setSchdulEnddeYYYMMDD(String schdulEnddeYYYMMDD) {
		this.schdulEnddeYYYMMDD = schdulEnddeYYYMMDD;
	}

}