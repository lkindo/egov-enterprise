package egovframework.com.cop.smt.sim.service;

import java.io.Serializable;
/**
 * ?쇱젙愿由?VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class IndvdlSchdulManageVO implements Serializable {

	private static final long serialVersionUID = 6643386546296100019L;

	/** ?쇱젙ID */
	private String schdulId;

	/** ?쇱젙援щ텇(?뚯쓽/援먯쑁/?몃???媛뺤쓽 湲고?) */
	private String schdulSe;

	/** ?쇱젙遺?쏧D */
	private String schdulDeptId;

	/** ?쇱젙醫낅쪟(遺?쒖씪??媛쒖씤?쇱젙) */
	private String schdulKindCode;

	/** ?쇱젙?쒖옉?쇱옄 */
	private String schdulBgnde;

	/** ?쇱젙醫낅즺?쇱옄 */
	private String schdulEndde;

	/** ?쇱젙紐?*/
	private String schdulNm;

	/** ?쇱젙?댁슜 */
	private String schdulCn;

	/** ?쇱젙?μ냼 */
	private String schdulPlace;

	/** ?쇱젙以묒슂?꾩퐫??*/
	private String schdulIpcrCode;

	/** ?쇱젙?대떞?륤D */
	private String schdulChargerId;

	/** 泥⑤??뚯씪ID */
	private String atchFileId;

	/** 諛섎났援щ텇(諛섎났, ?곗냽, ?붿씪諛섎났) */
	private String reptitSeCode;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";

	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";

	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";

	/** 理쒖쥌?섏젙ID */
	private String lastUpdusrId = "";

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

	/** ?대떦遺??*/
	private String schdulDeptName = "";

	/** ?대떦?먮챸 */
	private String schdulChargerName = "";

	/**
	 * schdulId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulId() {
		return schdulId;
	}

	/**
	 * schdulId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulId String
	 */
	public void setSchdulId(String schdulId) {
		this.schdulId = schdulId;
	}

	/**
	 * schdulSe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulSe() {
		return schdulSe;
	}

	/**
	 * schdulSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulSe String
	 */
	public void setSchdulSe(String schdulSe) {
		this.schdulSe = schdulSe;
	}

	/**
	 * schdulDeptId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulDeptId() {
		return schdulDeptId;
	}

	/**
	 * schdulDeptId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulDeptId String
	 */
	public void setSchdulDeptId(String schdulDeptId) {
		this.schdulDeptId = schdulDeptId;
	}

	/**
	 * schdulKindCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulKindCode() {
		return schdulKindCode;
	}

	/**
	 * schdulKindCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulKindCode String
	 */
	public void setSchdulKindCode(String schdulKindCode) {
		this.schdulKindCode = schdulKindCode;
	}

	/**
	 * schdulBgnde attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulBgnde() {
		return schdulBgnde;
	}

	/**
	 * schdulBgnde attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulBgnde String
	 */
	public void setSchdulBgnde(String schdulBgnde) {
		this.schdulBgnde = schdulBgnde;
	}

	/**
	 * schdulEndde attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulEndde() {
		return schdulEndde;
	}

	/**
	 * schdulEndde attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulEndde String
	 */
	public void setSchdulEndde(String schdulEndde) {
		this.schdulEndde = schdulEndde;
	}

	/**
	 * schdulNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulNm() {
		return schdulNm;
	}

	/**
	 * schdulNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulNm String
	 */
	public void setSchdulNm(String schdulNm) {
		this.schdulNm = schdulNm;
	}

	/**
	 * schdulCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulCn() {
		return schdulCn;
	}

	/**
	 * schdulCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulCn String
	 */
	public void setSchdulCn(String schdulCn) {
		this.schdulCn = schdulCn;
	}

	/**
	 * schdulPlace attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulPlace() {
		return schdulPlace;
	}

	/**
	 * schdulPlace attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulPlace String
	 */
	public void setSchdulPlace(String schdulPlace) {
		this.schdulPlace = schdulPlace;
	}

	/**
	 * schdulIpcrCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulIpcrCode() {
		return schdulIpcrCode;
	}

	/**
	 * schdulIpcrCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulIpcrCode String
	 */
	public void setSchdulIpcrCode(String schdulIpcrCode) {
		this.schdulIpcrCode = schdulIpcrCode;
	}

	/**
	 * schdulChargerId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulChargerId() {
		return schdulChargerId;
	}

	/**
	 * schdulChargerId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulChargerId String
	 */
	public void setSchdulChargerId(String schdulChargerId) {
		this.schdulChargerId = schdulChargerId;
	}

	/**
	 * atchFileId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return atchFileId String
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	/**
	 * reptitSeCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getReptitSeCode() {
		return reptitSeCode;
	}

	/**
	 * reptitSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return reptitSeCode String
	 */
	public void setReptitSeCode(String reptitSeCode) {
		this.reptitSeCode = reptitSeCode;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * schdulBgndeHH attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulBgndeHH() {
		return schdulBgndeHH;
	}

	/**
	 * schdulBgndeHH attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulBgndeHH String
	 */
	public void setSchdulBgndeHH(String schdulBgndeHH) {
		this.schdulBgndeHH = schdulBgndeHH;
	}

	/**
	 * schdulBgndeMM attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulBgndeMM() {
		return schdulBgndeMM;
	}

	/**
	 * schdulBgndeMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulBgndeMM String
	 */
	public void setSchdulBgndeMM(String schdulBgndeMM) {
		this.schdulBgndeMM = schdulBgndeMM;
	}

	/**
	 * schdulEnddeHH attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulEnddeHH() {
		return schdulEnddeHH;
	}

	/**
	 * schdulEnddeHH attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulEnddeHH String
	 */
	public void setSchdulEnddeHH(String schdulEnddeHH) {
		this.schdulEnddeHH = schdulEnddeHH;
	}

	/**
	 * schdulEnddeMM attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulEnddeMM() {
		return schdulEnddeMM;
	}

	/**
	 * schdulEnddeMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulEnddeMM String
	 */
	public void setSchdulEnddeMM(String schdulEnddeMM) {
		this.schdulEnddeMM = schdulEnddeMM;
	}

	/**
	 * schdulBgndeYYYMMDD attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulBgndeYYYMMDD() {
		return schdulBgndeYYYMMDD;
	}

	/**
	 * schdulBgndeYYYMMDD attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulBgndeYYYMMDD String
	 */
	public void setSchdulBgndeYYYMMDD(String schdulBgndeYYYMMDD) {
		this.schdulBgndeYYYMMDD = schdulBgndeYYYMMDD;
	}

	/**
	 * schdulEnddeYYYMMDD attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulEnddeYYYMMDD() {
		return schdulEnddeYYYMMDD;
	}

	/**
	 * schdulEnddeYYYMMDD attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulEnddeYYYMMDD String
	 */
	public void setSchdulEnddeYYYMMDD(String schdulEnddeYYYMMDD) {
		this.schdulEnddeYYYMMDD = schdulEnddeYYYMMDD;
	}

	/**
	 * schdulDeptName attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulDeptName() {
		return schdulDeptName;
	}

	/**
	 * schdulDeptName attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulDeptName String
	 */
	public void setSchdulDeptName(String schdulDeptName) {
		this.schdulDeptName = schdulDeptName;
	}

	/**
	 * schdulChargerName attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSchdulChargerName() {
		return schdulChargerName;
	}

	/**
	 * schdulChargerName attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return schdulChargerName String
	 */
	public void setSchdulChargerName(String schdulChargerName) {
		this.schdulChargerName = schdulChargerName;
	}


}
