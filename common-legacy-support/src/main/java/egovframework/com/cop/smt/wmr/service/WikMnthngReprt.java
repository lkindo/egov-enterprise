package egovframework.com.cop.smt.wmr.service;

import java.io.Serializable;

/**
 * ??
 * - ????????model ?????? ???.
 * 
 * ???
 * - ???, ????? ???? ???, ??, ???, ???? ??, ???, ?????,
 * ????,
 * ???, ???, ????? ????ID, ????, ??????????????
 * 
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:12:48
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
public class WikMnthngReprt implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ??? **/
	private String reprtId;
	/** ?????**/
	private String reprtSe;
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
	/** ????? **/
	private String reprtBgnDe;
	/** ???? **/
	private String reprtEndDe;
	/** ??? **/
	private String reprtThswikCn;
	/** ??? **/
	private String reprtLesseeCn;
	/** ?????**/
	private String partclrMatter;
	/** ????ID **/
	private String atchFileId;
	/** ???? **/
	private String confmDt;
	/** ?????**/
	private String reprtSttus;
	/** ??? **/
	private String frstRegisterId = "";
	/** ???? **/
	private String frstRegisterPnttm = "";
	/** ??? **/
	private String lastUpdusrId = "";
	/** ???? **/
	private String lastUpdusrPnttm = "";

	public String getReprtId() {
		return reprtId;
	}

	public void setReprtId(String reprtId) {
		this.reprtId = reprtId;
	}

	public String getReprtSe() {
		return reprtSe;
	}

	public void setReprtSe(String reprtSe) {
		this.reprtSe = reprtSe;
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

	public String getReprtBgnDe() {
		return reprtBgnDe;
	}

	public void setReprtBgnDe(String reprtBgnDe) {
		this.reprtBgnDe = reprtBgnDe;
	}

	public String getReprtEndDe() {
		return reprtEndDe;
	}

	public void setReprtEndDe(String reprtEndDe) {
		this.reprtEndDe = reprtEndDe;
	}

	public String getReprtThswikCn() {
		return reprtThswikCn;
	}

	public void setReprtThswikCn(String reprtThswikCn) {
		this.reprtThswikCn = reprtThswikCn;
	}

	public String getReprtLesseeCn() {
		return reprtLesseeCn;
	}

	public void setReprtLesseeCn(String reprtLesseeCn) {
		this.reprtLesseeCn = reprtLesseeCn;
	}

	public String getPartclrMatter() {
		return partclrMatter;
	}

	public void setPartclrMatter(String partclrMatter) {
		this.partclrMatter = partclrMatter;
	}

	public String getAtchFileId() {
		return atchFileId;
	}

	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	public String getConfmDt() {
		return confmDt;
	}

	public void setConfmDt(String confmDt) {
		this.confmDt = confmDt;
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
