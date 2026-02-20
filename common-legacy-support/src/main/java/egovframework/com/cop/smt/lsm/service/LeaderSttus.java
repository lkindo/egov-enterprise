package egovframework.com.cop.smt.lsm.service;

import java.io.Serializable;

/**
 * ??
 * - ????????model ?????? ???.
 * 
 * ???
 * - ?ID, ?? ?????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:06
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.6.28	???         ????
 *
 *          </pre>
 **/
public class LeaderSttus implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ?ID **/
	private String leaderId;
	/** ??**/
	private String leaderNm;
	/** ??? **/
	private String orgnztNm;
	/** ?? **/
	private String leaderSttus;
	/** ?? **/
	private String leaderSttusNm;
	/** ??? **/
	private String frstRegisterId = "";
	/** ???? **/
	private String frstRegisterPnttm = "";
	/** ??? **/
	private String lastUpdusrId = "";
	/** ???? **/
	private String lastUpdusrNm = "";
	/** ???? **/
	private String lastUpdusrPnttm = "";

	public String getLeaderId() {
		return leaderId;
	}

	public void setLeaderId(String leaderId) {
		this.leaderId = leaderId;
	}

	public String getLeaderNm() {
		return leaderNm;
	}

	public void setLeaderNm(String leaderNm) {
		this.leaderNm = leaderNm;
	}

	public String getOrgnztNm() {
		return orgnztNm;
	}

	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}

	public String getLeaderSttus() {
		return leaderSttus;
	}

	public void setLeaderSttus(String leaderSttus) {
		this.leaderSttus = leaderSttus;
	}

	public String getLeaderSttusNm() {
		return leaderSttusNm;
	}

	public void setLeaderSttusNm(String leaderSttusNm) {
		this.leaderSttusNm = leaderSttusNm;
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
