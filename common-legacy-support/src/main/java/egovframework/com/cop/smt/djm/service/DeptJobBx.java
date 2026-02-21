package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * ??
 * - ??????????model ?????? ???.
 * 
 * ???
 * - ????D, ????? ???, ???? ???????????
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
public class DeptJobBx implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ?????ID **/
	private String deptJobBxId;
	/** ?????**/
	private String deptJobBxNm;
	/** ???ID **/
	private String deptId;
	/** ??? **/
	private String deptNm;
	/** ???? **/
	private int indictOrdr;
	/** ????ID **/
	private String frstRegisterId = "";
	/** ???? **/
	private String frstRegisterPnttm = "";
	/** ????ID **/
	private String lastUpdusrId = "";
	/** ???? **/
	private String lastUpdusrNm = "";
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

	public int getIndictOrdr() {
		return indictOrdr;
	}

	public void setIndictOrdr(int indictOrdr) {
		this.indictOrdr = indictOrdr;
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
