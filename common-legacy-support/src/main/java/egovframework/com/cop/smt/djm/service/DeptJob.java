package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * ??
 * - ?????????model ?????? ???.
 * 
 * ???
 * - ????D, ????, ?????? ??????? ??????? ???, ????ID ???????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:04
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
public class DeptJob implements Serializable {

	private static final long serialVersionUID = 1L;

	/** ?????ID **/
	private String deptJobBxId;
	/** ?????**/
	private String deptJobBxNm;
	/** ???ID **/
	private String deptId;
	/** ??? **/
	private String deptNm;
	/** ?????ID **/
	private String deptJobId;
	/** ??????**/
	private String deptJobNm;
	/** ???????**/
	private String deptJobCn;
	/** ???????ID **/
	private String chargerId;
	/** ??????? **/
	private String chargerNm;
	/** ??? **/
	private String priort;
	/** ???? ID **/
	private String atchFileId;
	/** ????ID **/
	private String frstRegisterId = "";
	/** ???? **/
	private String frstRegisterPnttm = "";
	/** ??? **/
	private String lastUpdusrId = "";
	/** ???? **/
	private String lastUpdusrPnttm = "";

	public String getDeptJobBxId() {
		return deptJobBxId;
	}

	public void setDeptJobBxId(String deptJobBxId) {
		this.deptJobBxId = deptJobBxId;
	}

	public String getDeptJobBxNm() {
		return deptJobBxNm;
	}

	public void setDeptJobBxNm(String deptJobBxNm) {
		this.deptJobBxNm = deptJobBxNm;
	}

	public String getDeptId() {
		return deptId;
	}

	public void setDeptId(String deptId) {
		this.deptId = deptId;
	}

	public String getDeptNm() {
		return deptNm;
	}

	public void setDeptNm(String deptNm) {
		this.deptNm = deptNm;
	}

	public String getDeptJobId() {
		return deptJobId;
	}

	public void setDeptJobId(String deptJobId) {
		this.deptJobId = deptJobId;
	}

	public String getDeptJobNm() {
		return deptJobNm;
	}

	public void setDeptJobNm(String deptJobNm) {
		this.deptJobNm = deptJobNm;
	}

	public String getDeptJobCn() {
		return deptJobCn;
	}

	public void setDeptJobCn(String deptJobCn) {
		this.deptJobCn = deptJobCn;
	}

	public String getChargerId() {
		return chargerId;
	}

	public void setChargerId(String chargerId) {
		this.chargerId = chargerId;
	}

	public String getChargerNm() {
		return chargerNm;
	}

	public void setChargerNm(String chargerNm) {
		this.chargerNm = chargerNm;
	}

	public String getPriort() {
		return priort;
	}

	public void setPriort(String priort) {
		this.priort = priort;
	}

	public String getAtchFileId() {
		return atchFileId;
	}

	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
