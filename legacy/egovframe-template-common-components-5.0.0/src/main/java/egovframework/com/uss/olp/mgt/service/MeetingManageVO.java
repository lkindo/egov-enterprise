package egovframework.com.uss.olp.mgt.service;

import java.io.Serializable;
/**
 * ?뚯쓽愿由?Vo Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class MeetingManageVO implements Serializable {

	private static final long serialVersionUID = -4820974750521985908L;

	/** ?뚯쓽ID */
	private String mtgId = "";

	/** ?뚯쓽紐?*/
	private String mtgNm = "";

	/** ?뚯쓽?덇굔?댁슜 */
	private String mtgMtrCn = "";

	/** ?뚯쓽?쒕쾲 */
	private String mtgSn = "";

	/** ?뚯쓽??*/
	private String mtgCo = "";

	/** ?뚯쓽?쇱옄 */
	private String mtgDe = "";

	/** ?뚯쓽?μ냼 */
	private String mtgPlace = "";

	/** ?뚯쓽?쒖옉?쒓컙 */
	private String mtgBeginTime = "";

	/** ?뚯쓽醫낅즺?쒓컙 */
	private String mtgEndTime = "";

	/** 鍮꾧났媛쒗쉶?섏뿬遺 */
	private String clsdrMtgAt = "";

	/** ?대엺媛쒖떆?쇱옄 */
	private String readngBeginDe = "";

	/** ?대엺?щ? */
	private String readngAt = "";

	/** ?뚯쓽寃곌낵?댁슜 */
	private String mtgResultCn = "";

	/** ?뚯쓽寃곌낵?좊Т */
	private String mtgResultEnnc = "";

	/** 湲고??ы빆 */
	private String etcMatter = "";

	/** 二쇨?遺?쏧D */
	private String mngtDeptId = "";

	/** 二쇨?遺?쒕챸 */
	private String mngtDeptNm = "";

	/** 二쇨??륤D */
	private String mnaerId = "";

	/** 二쇨??먮챸 */
	private String mnaerNm = "";

	/** 二쇨??먮챸 */
	private String mnaerDeptId = "";

	/** 二쇨??먮??쒕챸 */
	private String mnaerDeptNm = "";

	/** 二쇨??먯쭅?꾩쭅湲됱퐫??*/
	private String mnaerOfcpsClsfCode = "";

	/** ?뚯쓽?щ? */
	private String mtnAt = "";

	/** 遺덉갭?앹옄??*/
	private String nonatdrnCo = "";

	/** 李몄꽍?먯닔 */
	private String atdrnCo = "";

	/** ?뚯쓽?쒖옉 ?쒓컙 */
	private String mtgBeginHH = "";

	/** ?뚯쓽?쒖옉 遺?*/
	private String mtgBeginMM = "";

	/** ?뚯쓽醫낅즺 ?쒓컙 */
	private String mtgEndHH = "";

	/** ?뚯쓽醫낅즺 遺?*/
	private String mtgEndMM = "";

	/** 理쒖큹?깅줉?쒖젏  */
	private String frstRegisterPnttm = "";

	/** 理쒖큹?깅줉?꾩씠??*/
	private String frstRegisterId = "";

	/** 理쒖쥌?섏젙??*/
	private String lastUpdusrPnttm = "";

	/** 理쒖쥌?섏젙???꾩씠??*/
	private String lastUpdusrId = "";

	/** ?붾㈃ 紐낅졊 泥섎━ */
	private String cmd = "";

	/**
	 * mtgId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgId() {
		return mtgId;
	}
	/**
	 * mtgId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgId String
	 */
	public void setMtgId(String mtgId) {
		this.mtgId = mtgId;
	}
	/**
	 * mtgNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgNm() {
		return mtgNm;
	}
	/**
	 * mtgNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgNm String
	 */
	public void setMtgNm(String mtgNm) {
		this.mtgNm = mtgNm;
	}
	/**
	 * mtgMtrCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgMtrCn() {
		return mtgMtrCn;
	}
	/**
	 * mtgMtrCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgMtrCn String
	 */
	public void setMtgMtrCn(String mtgMtrCn) {
		this.mtgMtrCn = mtgMtrCn;
	}
	/**
	 * mtgSn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgSn() {
		return mtgSn;
	}
	/**
	 * mtgSn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgSn String
	 */
	public void setMtgSn(String mtgSn) {
		this.mtgSn = mtgSn;
	}
	/**
	 * mtgCo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgCo() {
		return mtgCo;
	}
	/**
	 * mtgCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgCo String
	 */
	public void setMtgCo(String mtgCo) {
		this.mtgCo = mtgCo;
	}
	/**
	 * mtgDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgDe() {
		return mtgDe;
	}
	/**
	 * mtgDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgDe String
	 */
	public void setMtgDe(String mtgDe) {
		this.mtgDe = mtgDe;
	}
	/**
	 * mtgPlace attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgPlace() {
		return mtgPlace;
	}
	/**
	 * mtgPlace attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgPlace String
	 */
	public void setMtgPlace(String mtgPlace) {
		this.mtgPlace = mtgPlace;
	}
	/**
	 * mtgBeginTime attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgBeginTime() {
		return mtgBeginTime;
	}
	/**
	 * mtgBeginTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgBeginTime String
	 */
	public void setMtgBeginTime(String mtgBeginTime) {
		this.mtgBeginTime = mtgBeginTime;
	}
	/**
	 * mtgEndTime attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgEndTime() {
		return mtgEndTime;
	}
	/**
	 * mtgEndTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgEndTime String
	 */
	public void setMtgEndTime(String mtgEndTime) {
		this.mtgEndTime = mtgEndTime;
	}
	/**
	 * clsdrMtgAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getClsdrMtgAt() {
		return clsdrMtgAt;
	}
	/**
	 * clsdrMtgAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return clsdrMtgAt String
	 */
	public void setClsdrMtgAt(String clsdrMtgAt) {
		this.clsdrMtgAt = clsdrMtgAt;
	}
	/**
	 * readngBeginDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getReadngBeginDe() {
		return readngBeginDe;
	}
	/**
	 * readngBeginDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return readngBeginDe String
	 */
	public void setReadngBeginDe(String readngBeginDe) {
		this.readngBeginDe = readngBeginDe;
	}
	/**
	 * readngAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getReadngAt() {
		return readngAt;
	}
	/**
	 * readngAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return readngAt String
	 */
	public void setReadngAt(String readngAt) {
		this.readngAt = readngAt;
	}
	/**
	 * mtgResultCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgResultCn() {
		return mtgResultCn;
	}
	/**
	 * mtgResultCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgResultCn String
	 */
	public void setMtgResultCn(String mtgResultCn) {
		this.mtgResultCn = mtgResultCn;
	}
	/**
	 * mtgResultEnnc attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgResultEnnc() {
		return mtgResultEnnc;
	}
	/**
	 * mtgResultEnnc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgResultEnnc String
	 */
	public void setMtgResultEnnc(String mtgResultEnnc) {
		this.mtgResultEnnc = mtgResultEnnc;
	}
	/**
	 * etcMatter attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEtcMatter() {
		return etcMatter;
	}
	/**
	 * etcMatter attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return etcMatter String
	 */
	public void setEtcMatter(String etcMatter) {
		this.etcMatter = etcMatter;
	}
	/**
	 * mngtDeptId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMngtDeptId() {
		return mngtDeptId;
	}
	/**
	 * mngtDeptId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mngtDeptId String
	 */
	public void setMngtDeptId(String mngtDeptId) {
		this.mngtDeptId = mngtDeptId;
	}
	/**
	 * mngtDeptNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMngtDeptNm() {
		return mngtDeptNm;
	}
	/**
	 * mngtDeptNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mngtDeptNm String
	 */
	public void setMngtDeptNm(String mngtDeptNm) {
		this.mngtDeptNm = mngtDeptNm;
	}
	/**
	 * mnaerId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMnaerId() {
		return mnaerId;
	}
	/**
	 * mnaerId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mnaerId String
	 */
	public void setMnaerId(String mnaerId) {
		this.mnaerId = mnaerId;
	}
	/**
	 * mnaerNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMnaerNm() {
		return mnaerNm;
	}
	/**
	 * mnaerNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mnaerNm String
	 */
	public void setMnaerNm(String mnaerNm) {
		this.mnaerNm = mnaerNm;
	}
	/**
	 * mnaerDeptId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMnaerDeptId() {
		return mnaerDeptId;
	}
	/**
	 * mnaerDeptId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mnaerDeptId String
	 */
	public void setMnaerDeptId(String mnaerDeptId) {
		this.mnaerDeptId = mnaerDeptId;
	}
	/**
	 * mnaerDeptNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMnaerDeptNm() {
		return mnaerDeptNm;
	}
	/**
	 * mnaerDeptNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mnaerDeptNm String
	 */
	public void setMnaerDeptNm(String mnaerDeptNm) {
		this.mnaerDeptNm = mnaerDeptNm;
	}
	/**
	 * mnaerOfcpsClsfCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMnaerOfcpsClsfCode() {
		return mnaerOfcpsClsfCode;
	}
	/**
	 * mnaerOfcpsClsfCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mnaerOfcpsClsfCode String
	 */
	public void setMnaerOfcpsClsfCode(String mnaerOfcpsClsfCode) {
		this.mnaerOfcpsClsfCode = mnaerOfcpsClsfCode;
	}
	/**
	 * mtnAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtnAt() {
		return mtnAt;
	}
	/**
	 * mtnAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtnAt String
	 */
	public void setMtnAt(String mtnAt) {
		this.mtnAt = mtnAt;
	}
	/**
	 * nonatdrnCo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNonatdrnCo() {
		return nonatdrnCo;
	}
	/**
	 * nonatdrnCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return nonatdrnCo String
	 */
	public void setNonatdrnCo(String nonatdrnCo) {
		this.nonatdrnCo = nonatdrnCo;
	}
	/**
	 * atdrnCo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAtdrnCo() {
		return atdrnCo;
	}
	/**
	 * atdrnCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return atdrnCo String
	 */
	public void setAtdrnCo(String atdrnCo) {
		this.atdrnCo = atdrnCo;
	}
	/**
	 * mtgBeginHH attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgBeginHH() {
		return mtgBeginHH;
	}
	/**
	 * mtgBeginHH attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgBeginHH String
	 */
	public void setMtgBeginHH(String mtgBeginHH) {
		this.mtgBeginHH = mtgBeginHH;
	}
	/**
	 * mtgBeginMM attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgBeginMM() {
		return mtgBeginMM;
	}
	/**
	 * mtgBeginMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgBeginMM String
	 */
	public void setMtgBeginMM(String mtgBeginMM) {
		this.mtgBeginMM = mtgBeginMM;
	}
	/**
	 * mtgEndHH attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgEndHH() {
		return mtgEndHH;
	}
	/**
	 * mtgEndHH attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgEndHH String
	 */
	public void setMtgEndHH(String mtgEndHH) {
		this.mtgEndHH = mtgEndHH;
	}
	/**
	 * mtgEndMM attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMtgEndMM() {
		return mtgEndMM;
	}
	/**
	 * mtgEndMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return mtgEndMM String
	 */
	public void setMtgEndMM(String mtgEndMM) {
		this.mtgEndMM = mtgEndMM;
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
	 * cmd attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getCmd() {
		return cmd;
	}
	/**
	 * cmd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return cmd String
	 */
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
