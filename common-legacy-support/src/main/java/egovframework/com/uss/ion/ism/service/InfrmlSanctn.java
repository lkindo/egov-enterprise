package egovframework.com.uss.ion.ism.service;

import java.io.Serializable;

/**
 * ??
 * - ????? ????model ?????? ???.
 * 
 * ???
 * - ???D, ????, ????? ?RL, ??, ???, ???, ??, ???, ????? ?????,
 * ???, ???? ???????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:29:26
 **/
public class InfrmlSanctn implements Serializable {

	private static final long serialVersionUID = 1L;
	/**
	 * ???D
	 **/
	private String infrmlSanctnId;
	/**
	 * ????
	 **/
	private String jobSeCode;
	/**
	 * ?????
	 **/
	private String jobSeNm;
	/**
	 * ??
	 **/
	private String applcntId;
	/**
	 * ???
	 **/
	private String applcntNm;
	/**
	 * ???
	 **/
	private String reqstDe = "";
	/**
	 * ??
	 **/
	private String sanctnerId;
	/**
	 * ???
	 **/
	private String sanctnerNm;
	/**
	 * ?????
	 **/
	private String sanctnerOrgnztNm;
	/**
	 * ?????
	 **/
	private String confmAt = "";
	/**
	 * ???
	 **/
	private String sanctnDt = "";
	/**
	 * ????
	 **/
	private String returnResn = "";
	/**
	 * ????ID
	 **/
	private String frstRegisterId = "";
	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";
	/**
	 * ???
	 **/
	private String lastUpdusrId = "";
	/**
	 * ????
	 **/
	private String lastUpdusrNm = "";
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm = "";

	public String getInfrmlSanctnId() {
		return infrmlSanctnId;
	}

	public void setInfrmlSanctnId(String infrmlSanctnId) {
		this.infrmlSanctnId = infrmlSanctnId;
	}

	public String getJobSeCode() {
		return jobSeCode;
	}

	public void setJobSeCode(String jobSeCode) {
		this.jobSeCode = jobSeCode;
	}

	public String getJobSeNm() {
		return jobSeNm;
	}

	public void setJobSeNm(String jobSeNm) {
		this.jobSeNm = jobSeNm;
	}

	public String getApplcntId() {
		return applcntId;
	}

	public void setApplcntId(String applcntId) {
		this.applcntId = applcntId;
	}

	public String getApplcntNm() {
		return applcntNm;
	}

	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}

	public String getReqstDe() {
		return reqstDe;
	}

	public void setReqstDe(String reqstDe) {
		this.reqstDe = reqstDe;
	}

	public String getSanctnerId() {
		return sanctnerId;
	}

	public void setSanctnerId(String sanctnerId) {
		this.sanctnerId = sanctnerId;
	}

	public String getSanctnerNm() {
		return sanctnerNm;
	}

	public void setSanctnerNm(String sanctnerNm) {
		this.sanctnerNm = sanctnerNm;
	}

	public String getSanctnerOrgnztNm() {
		return sanctnerOrgnztNm;
	}

	public void setSanctnerOrgnztNm(String sanctnerOrgnztNm) {
		this.sanctnerOrgnztNm = sanctnerOrgnztNm;
	}

	public String getConfmAt() {
		return confmAt;
	}

	public void setConfmAt(String confmAt) {
		this.confmAt = confmAt;
	}

	public String getSanctnDt() {
		return sanctnDt;
	}

	public void setSanctnDt(String sanctnDt) {
		this.sanctnDt = sanctnDt;
	}

	public String getReturnResn() {
		return returnResn;
	}

	public void setReturnResn(String returnResn) {
		this.returnResn = returnResn;
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

	public String getLastUpdusrNm() {
		return lastUpdusrNm;
	}

	public void setLastUpdusrNm(String lastUpdusrNm) {
		this.lastUpdusrNm = lastUpdusrNm;
	}

	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

}
