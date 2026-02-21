package egovframework.com.cop.smt.mrm.service;

import java.io.Serializable;

/**
 * ??
 * - ????????model ?????? ???.
 * 
 * ???
 * - ???, ???? ???, ??, ???, ???? ??, ???, ???, ???? ???????
 * ????????
 * ??????????????
 * 
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:14:53
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *
 *          </pre>
 **/
public class MemoReprt implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ??? **/
	private String reprtId;
	/** ????**/
	private String reprtSj;
	/** ??? **/
	private String reprtDe;
	/** ?? **/
	private String wrterId;
	/** ??? **/
	private String wrterNm;
	/** ????**/
	private String wrterClsfNm;
	/** ?? **/
	private String reportrId;
	/** ??? **/
	private String reportrNm;
	/** ????**/
	private String reportrClsfNm;
	/** ??? **/
	private String reprtCn;
	/** ????ID **/
	private String atchFileId;
	/** ????**/
	private String drctMatter;
	/** ???????**/
	private String drctMatterRegistDt;
	/** ????????**/
	private String reportrInqireDt;
	/** ?????**/
	private String reprtSttus;
	/** ??? **/
	private String frstRegisterId;
	/** ???? **/
	private String frstRegisterPnttm;
	/** ??? **/
	private String lastUpdusrId;
	/** ???? **/
	private String lastUpdusrPnttm;

	public String getReprtId() {
		return reprtId;
	}

	public void setReprtId(String reprtId) {
		this.reprtId = reprtId;
	}

	public String getReprtSj() {
		return reprtSj;
	}

	public void setReprtSj(String reprtSj) {
		this.reprtSj = reprtSj;
	}

	public String getReprtDe() {
		return reprtDe;
	}

	public void setReprtDe(String reprtDe) {
		this.reprtDe = reprtDe;
	}

	public String getWrterId() {
		return wrterId;
	}

	public void setWrterId(String wrterId) {
		this.wrterId = wrterId;
	}

	public String getWrterNm() {
		return wrterNm;
	}

	public void setWrterNm(String wrterNm) {
		this.wrterNm = wrterNm;
	}

	public String getWrterClsfNm() {
		return wrterClsfNm;
	}

	public void setWrterClsfNm(String wrterClsfNm) {
		this.wrterClsfNm = wrterClsfNm;
	}

	public String getReportrId() {
		return reportrId;
	}

	public void setReportrId(String reportrId) {
		this.reportrId = reportrId;
	}

	public String getReportrNm() {
		return reportrNm;
	}

	public void setReportrNm(String reportrNm) {
		this.reportrNm = reportrNm;
	}

	public String getReportrClsfNm() {
		return reportrClsfNm;
	}

	public void setReportrClsfNm(String reportrClsfNm) {
		this.reportrClsfNm = reportrClsfNm;
	}

	public String getReprtCn() {
		return reprtCn;
	}

	public void setReprtCn(String reprtCn) {
		this.reprtCn = reprtCn;
	}

	public String getAtchFileId() {
		return atchFileId;
	}

	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	public String getDrctMatter() {
		return drctMatter;
	}

	public void setDrctMatter(String drctMatter) {
		this.drctMatter = drctMatter;
	}

	public String getDrctMatterRegistDt() {
		return drctMatterRegistDt;
	}

	public void setDrctMatterRegistDt(String drctMatterRegistDt) {
		this.drctMatterRegistDt = drctMatterRegistDt;
	}

	public String getReportrInqireDt() {
		return reportrInqireDt;
	}

	public void setReportrInqireDt(String reportrInqireDt) {
		this.reportrInqireDt = reportrInqireDt;
	}

	public String getReprtSttus() {
		return reprtSttus;
	}

	public void setReprtSttus(String reprtSttus) {
		this.reprtSttus = reprtSttus;
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

}
