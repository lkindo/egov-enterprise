package egovframework.com.uss.olp.qtm.service;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * ??????VO Class ?
 * 
 * @author ?????????
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ???         ????
 *   2025.08.26  ????         2025????????PMD???????? ????????-AvoidArrayLoops(?????? ???? ?? ???? System.arraycopy() ???? ???? ?? ???????? ?? ???
 *
 *      </pre>
 **/
public class QustnrTmplatManageVO implements Serializable {

	private static final long serialVersionUID = 4589288390515705950L;

	/** ?????????**/
	private String qestnrTmplatId = "";

	/** ??????? **/
	private String qestnrTmplatTy = "";

	/** ???? ????? **/
	@Getter
	@Setter
	private byte[] qestnrTmplatImagepathnm;

	/** ???????? **/
	private String qestnrTmplatCn = "";

	/** ?????? **/
	private String qestnrTmplatCours;

	/** ???? **/
	private String frstRegisterPnttm = "";

	/** ???????**/
	private String frstRegisterId = "";

	/** ?????? **/
	private String lastUpdusrPnttm = "";

	/** ???????**/
	private String lastUpdusrId = "";

	/** ? ???**/
	private String cmd = "";

	/**
	 * qestnrTmplatId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getQestnrTmplatId() {
		return qestnrTmplatId;
	}

	/**
	 * qestnrTmplatId attribute ???????.
	 * 
	 * @return qestnrTmplatId String
	 **/
	public void setQestnrTmplatId(String qestnrTmplatId) {
		this.qestnrTmplatId = qestnrTmplatId;
	}

	/**
	 * qestnrTmplatTy attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getQestnrTmplatTy() {
		return qestnrTmplatTy;
	}

	/**
	 * qestnrTmplatTy attribute ???????.
	 * 
	 * @return qestnrTmplatTy String
	 **/
	public void setQestnrTmplatTy(String qestnrTmplatTy) {
		this.qestnrTmplatTy = qestnrTmplatTy;
	}

	/**
	 * qestnrTmplatCn attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getQestnrTmplatCn() {
		return qestnrTmplatCn;
	}

	/**
	 * qestnrTmplatCn attribute ???????.
	 * 
	 * @return qestnrTmplatCn String
	 **/
	public void setQestnrTmplatCn(String qestnrTmplatCn) {
		this.qestnrTmplatCn = qestnrTmplatCn;
	}

	/**
	 * qestnrTmplatCours attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getQestnrTmplatCours() {
		return qestnrTmplatCours;
	}

	/**
	 * qestnrTmplatCours attribute ???????.
	 * 
	 * @return qestnrTmplatCours String
	 **/
	public void setQestnrTmplatCours(String qestnrTmplatCours) {
		this.qestnrTmplatCours = qestnrTmplatCours;
	}

	/**
	 * frstRegisterPnttm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute ???????.
	 * 
	 * @return frstRegisterPnttm String
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * 
	 * @return frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute ???????.
	 * 
	 * @return lastUpdusrPnttm String
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * 
	 * @return lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd attribute ???????.
	 * 
	 * @return cmd String
	 **/
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
