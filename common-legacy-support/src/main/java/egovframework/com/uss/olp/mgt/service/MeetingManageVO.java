package egovframework.com.uss.olp.mgt.service;

import java.io.Serializable;
/**
 * ??????Vo Class ?
 * @author ?????????
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ???         ????
 *
 * </pre>
 **/
public class MeetingManageVO implements Serializable {

	private static final long serialVersionUID = -4820974750521985908L;

	/** ???ID **/
	private String mtgId = "";

	/** ????**/
	private String mtgNm = "";

	/** ??????? **/
	private String mtgMtrCn = "";

	/** ????? **/
	private String mtgSn = "";

	/** ?????**/
	private String mtgCo = "";

	/** ????? **/
	private String mtgDe = "";

	/** ??????**/
	private String mtgPlace = "";

	/** ??????? **/
	private String mtgBeginTime = "";

	/** ?????? **/
	private String mtgEndTime = "";

	/** ??????? **/
	private String clsdrMtgAt = "";

	/** ?????? **/
	private String readngBeginDe = "";

	/** ?????? **/
	private String readngAt = "";

	/** ?????? **/
	private String mtgResultCn = "";

	/** ??????**/
	private String mtgResultEnnc = "";

	/** ????**/
	private String etcMatter = "";

	/** ???? **/
	private String mngtDeptId = "";

	/** ???? **/
	private String mngtDeptNm = "";

	/** ?? **/
	private String mnaerId = "";

	/** ??? **/
	private String mnaerNm = "";

	/** ??? **/
	private String mnaerDeptId = "";

	/** ????? **/
	private String mnaerDeptNm = "";

	/** ???????**/
	private String mnaerOfcpsClsfCode = "";

	/** ?????? **/
	private String mtnAt = "";

	/** ?????**/
	private String nonatdrnCo = "";

	/** ?? **/
	private String atdrnCo = "";

	/** ????? ?? **/
	private String mtgBeginHH = "";

	/** ????? ??**/
	private String mtgBeginMM = "";

	/** ??????? **/
	private String mtgEndHH = "";

	/** ???????**/
	private String mtgEndMM = "";

	/** ????  **/
	private String frstRegisterPnttm = "";

	/** ?????**/
	private String frstRegisterId = "";

	/** ????**/
	private String lastUpdusrPnttm = "";

	/** ???????**/
	private String lastUpdusrId = "";

	/** ? ???**/
	private String cmd = "";

	/**
	 * mtgId attribute ?????.
	 * @return the String
	 **/
	public String getMtgId() {
		return mtgId;
	}
	/**
	 * mtgId attribute ???????.
	 * @return mtgId String
	 **/
	public void setMtgId(String mtgId) {
		this.mtgId = mtgId;
	}
	/**
	 * mtgNm attribute ?????.
	 * @return the String
	 **/
	public String getMtgNm() {
		return mtgNm;
	}
	/**
	 * mtgNm attribute ???????.
	 * @return mtgNm String
	 **/
	public void setMtgNm(String mtgNm) {
		this.mtgNm = mtgNm;
	}
	/**
	 * mtgMtrCn attribute ?????.
	 * @return the String
	 **/
	public String getMtgMtrCn() {
		return mtgMtrCn;
	}
	/**
	 * mtgMtrCn attribute ???????.
	 * @return mtgMtrCn String
	 **/
	public void setMtgMtrCn(String mtgMtrCn) {
		this.mtgMtrCn = mtgMtrCn;
	}
	/**
	 * mtgSn attribute ?????.
	 * @return the String
	 **/
	public String getMtgSn() {
		return mtgSn;
	}
	/**
	 * mtgSn attribute ???????.
	 * @return mtgSn String
	 **/
	public void setMtgSn(String mtgSn) {
		this.mtgSn = mtgSn;
	}
	/**
	 * mtgCo attribute ?????.
	 * @return the String
	 **/
	public String getMtgCo() {
		return mtgCo;
	}
	/**
	 * mtgCo attribute ???????.
	 * @return mtgCo String
	 **/
	public void setMtgCo(String mtgCo) {
		this.mtgCo = mtgCo;
	}
	/**
	 * mtgDe attribute ?????.
	 * @return the String
	 **/
	public String getMtgDe() {
		return mtgDe;
	}
	/**
	 * mtgDe attribute ???????.
	 * @return mtgDe String
	 **/
	public void setMtgDe(String mtgDe) {
		this.mtgDe = mtgDe;
	}
	/**
	 * mtgPlace attribute ?????.
	 * @return the String
	 **/
	public String getMtgPlace() {
		return mtgPlace;
	}
	/**
	 * mtgPlace attribute ???????.
	 * @return mtgPlace String
	 **/
	public void setMtgPlace(String mtgPlace) {
		this.mtgPlace = mtgPlace;
	}
	/**
	 * mtgBeginTime attribute ?????.
	 * @return the String
	 **/
	public String getMtgBeginTime() {
		return mtgBeginTime;
	}
	/**
	 * mtgBeginTime attribute ???????.
	 * @return mtgBeginTime String
	 **/
	public void setMtgBeginTime(String mtgBeginTime) {
		this.mtgBeginTime = mtgBeginTime;
	}
	/**
	 * mtgEndTime attribute ?????.
	 * @return the String
	 **/
	public String getMtgEndTime() {
		return mtgEndTime;
	}
	/**
	 * mtgEndTime attribute ???????.
	 * @return mtgEndTime String
	 **/
	public void setMtgEndTime(String mtgEndTime) {
		this.mtgEndTime = mtgEndTime;
	}
	/**
	 * clsdrMtgAt attribute ?????.
	 * @return the String
	 **/
	public String getClsdrMtgAt() {
		return clsdrMtgAt;
	}
	/**
	 * clsdrMtgAt attribute ???????.
	 * @return clsdrMtgAt String
	 **/
	public void setClsdrMtgAt(String clsdrMtgAt) {
		this.clsdrMtgAt = clsdrMtgAt;
	}
	/**
	 * readngBeginDe attribute ?????.
	 * @return the String
	 **/
	public String getReadngBeginDe() {
		return readngBeginDe;
	}
	/**
	 * readngBeginDe attribute ???????.
	 * @return readngBeginDe String
	 **/
	public void setReadngBeginDe(String readngBeginDe) {
		this.readngBeginDe = readngBeginDe;
	}
	/**
	 * readngAt attribute ?????.
	 * @return the String
	 **/
	public String getReadngAt() {
		return readngAt;
	}
	/**
	 * readngAt attribute ???????.
	 * @return readngAt String
	 **/
	public void setReadngAt(String readngAt) {
		this.readngAt = readngAt;
	}
	/**
	 * mtgResultCn attribute ?????.
	 * @return the String
	 **/
	public String getMtgResultCn() {
		return mtgResultCn;
	}
	/**
	 * mtgResultCn attribute ???????.
	 * @return mtgResultCn String
	 **/
	public void setMtgResultCn(String mtgResultCn) {
		this.mtgResultCn = mtgResultCn;
	}
	/**
	 * mtgResultEnnc attribute ?????.
	 * @return the String
	 **/
	public String getMtgResultEnnc() {
		return mtgResultEnnc;
	}
	/**
	 * mtgResultEnnc attribute ???????.
	 * @return mtgResultEnnc String
	 **/
	public void setMtgResultEnnc(String mtgResultEnnc) {
		this.mtgResultEnnc = mtgResultEnnc;
	}
	/**
	 * etcMatter attribute ?????.
	 * @return the String
	 **/
	public String getEtcMatter() {
		return etcMatter;
	}
	/**
	 * etcMatter attribute ???????.
	 * @return etcMatter String
	 **/
	public void setEtcMatter(String etcMatter) {
		this.etcMatter = etcMatter;
	}
	/**
	 * mngtDeptId attribute ?????.
	 * @return the String
	 **/
	public String getMngtDeptId() {
		return mngtDeptId;
	}
	/**
	 * mngtDeptId attribute ???????.
	 * @return mngtDeptId String
	 **/
	public void setMngtDeptId(String mngtDeptId) {
		this.mngtDeptId = mngtDeptId;
	}
	/**
	 * mngtDeptNm attribute ?????.
	 * @return the String
	 **/
	public String getMngtDeptNm() {
		return mngtDeptNm;
	}
	/**
	 * mngtDeptNm attribute ???????.
	 * @return mngtDeptNm String
	 **/
	public void setMngtDeptNm(String mngtDeptNm) {
		this.mngtDeptNm = mngtDeptNm;
	}
	/**
	 * mnaerId attribute ?????.
	 * @return the String
	 **/
	public String getMnaerId() {
		return mnaerId;
	}
	/**
	 * mnaerId attribute ???????.
	 * @return mnaerId String
	 **/
	public void setMnaerId(String mnaerId) {
		this.mnaerId = mnaerId;
	}
	/**
	 * mnaerNm attribute ?????.
	 * @return the String
	 **/
	public String getMnaerNm() {
		return mnaerNm;
	}
	/**
	 * mnaerNm attribute ???????.
	 * @return mnaerNm String
	 **/
	public void setMnaerNm(String mnaerNm) {
		this.mnaerNm = mnaerNm;
	}
	/**
	 * mnaerDeptId attribute ?????.
	 * @return the String
	 **/
	public String getMnaerDeptId() {
		return mnaerDeptId;
	}
	/**
	 * mnaerDeptId attribute ???????.
	 * @return mnaerDeptId String
	 **/
	public void setMnaerDeptId(String mnaerDeptId) {
		this.mnaerDeptId = mnaerDeptId;
	}
	/**
	 * mnaerDeptNm attribute ?????.
	 * @return the String
	 **/
	public String getMnaerDeptNm() {
		return mnaerDeptNm;
	}
	/**
	 * mnaerDeptNm attribute ???????.
	 * @return mnaerDeptNm String
	 **/
	public void setMnaerDeptNm(String mnaerDeptNm) {
		this.mnaerDeptNm = mnaerDeptNm;
	}
	/**
	 * mnaerOfcpsClsfCode attribute ?????.
	 * @return the String
	 **/
	public String getMnaerOfcpsClsfCode() {
		return mnaerOfcpsClsfCode;
	}
	/**
	 * mnaerOfcpsClsfCode attribute ???????.
	 * @return mnaerOfcpsClsfCode String
	 **/
	public void setMnaerOfcpsClsfCode(String mnaerOfcpsClsfCode) {
		this.mnaerOfcpsClsfCode = mnaerOfcpsClsfCode;
	}
	/**
	 * mtnAt attribute ?????.
	 * @return the String
	 **/
	public String getMtnAt() {
		return mtnAt;
	}
	/**
	 * mtnAt attribute ???????.
	 * @return mtnAt String
	 **/
	public void setMtnAt(String mtnAt) {
		this.mtnAt = mtnAt;
	}
	/**
	 * nonatdrnCo attribute ?????.
	 * @return the String
	 **/
	public String getNonatdrnCo() {
		return nonatdrnCo;
	}
	/**
	 * nonatdrnCo attribute ???????.
	 * @return nonatdrnCo String
	 **/
	public void setNonatdrnCo(String nonatdrnCo) {
		this.nonatdrnCo = nonatdrnCo;
	}
	/**
	 * atdrnCo attribute ?????.
	 * @return the String
	 **/
	public String getAtdrnCo() {
		return atdrnCo;
	}
	/**
	 * atdrnCo attribute ???????.
	 * @return atdrnCo String
	 **/
	public void setAtdrnCo(String atdrnCo) {
		this.atdrnCo = atdrnCo;
	}
	/**
	 * mtgBeginHH attribute ?????.
	 * @return the String
	 **/
	public String getMtgBeginHH() {
		return mtgBeginHH;
	}
	/**
	 * mtgBeginHH attribute ???????.
	 * @return mtgBeginHH String
	 **/
	public void setMtgBeginHH(String mtgBeginHH) {
		this.mtgBeginHH = mtgBeginHH;
	}
	/**
	 * mtgBeginMM attribute ?????.
	 * @return the String
	 **/
	public String getMtgBeginMM() {
		return mtgBeginMM;
	}
	/**
	 * mtgBeginMM attribute ???????.
	 * @return mtgBeginMM String
	 **/
	public void setMtgBeginMM(String mtgBeginMM) {
		this.mtgBeginMM = mtgBeginMM;
	}
	/**
	 * mtgEndHH attribute ?????.
	 * @return the String
	 **/
	public String getMtgEndHH() {
		return mtgEndHH;
	}
	/**
	 * mtgEndHH attribute ???????.
	 * @return mtgEndHH String
	 **/
	public void setMtgEndHH(String mtgEndHH) {
		this.mtgEndHH = mtgEndHH;
	}
	/**
	 * mtgEndMM attribute ?????.
	 * @return the String
	 **/
	public String getMtgEndMM() {
		return mtgEndMM;
	}
	/**
	 * mtgEndMM attribute ???????.
	 * @return mtgEndMM String
	 **/
	public void setMtgEndMM(String mtgEndMM) {
		this.mtgEndMM = mtgEndMM;
	}
	/**
	 * frstRegisterPnttm attribute ?????.
	 * @return the String
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * frstRegisterPnttm attribute ???????.
	 * @return frstRegisterPnttm String
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * frstRegisterId attribute ?????.
	 * @return the String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * frstRegisterId attribute ???????.
	 * @return frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * lastUpdusrPnttm attribute ?????.
	 * @return the String
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * lastUpdusrPnttm attribute ???????.
	 * @return lastUpdusrPnttm String
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * lastUpdusrId attribute ?????.
	 * @return the String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * lastUpdusrId attribute ???????.
	 * @return lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * cmd attribute ?????.
	 * @return the String
	 **/
	public String getCmd() {
		return cmd;
	}
	/**
	 * cmd attribute ???????.
	 * @return cmd String
	 **/
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
