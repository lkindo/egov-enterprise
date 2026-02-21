package egovframework.com.uss.olp.qim.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;
/**
 * ????????VO Class ?
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
 *   2009.03.20  ???		????
 *   2024.10.29  ??		??BindingResult ??? @NotEmpty ??
 *
 * </pre>
 **/
public class QustnrItemManageVO implements Serializable {

	private static final long serialVersionUID = -8233519594470362395L;

	/** ??? ???**/
	private String qestnrQesitmId = "";

	/** ???? ???**/
	@NotEmpty(message = "??   ?         {common.required.msg}")
	private String qestnrId = "";

	/** ????? **/
	@NotEmpty(message = "?????      {common.required.msg}")
	private String iemSn = "";

	/** ????? **/
	@NotEmpty(message = "?????      {common.required.msg}")
	private String qustnrIemId = "";

	/** ????????**/
	private String iemCn = "";

	/** ??????? **/
	@NotEmpty(message = "         ???????{common.required.msg}")
	private String etcAnswerAt = "";

	/** ?????????????**/
	@NotEmpty(message = "??   ?            ?         {common.required.msg}")
	private String qestnrTmplatId = "";

	/** ????  **/
	private String frstRegisterPnttm = "";

	/** ?????**/
	private String frstRegisterId = "";

	/** ????**/
	private String lastUpdusrPnttm = "";

	/** ???????**/
	private String lastUpdusrId = "";

	/** ?????**/
	private String cmd = "";

	/**
	 * qestnrQesitmId attribute ?????.
	 * @return the String
	 **/
	public String getQestnrQesitmId() {
		return qestnrQesitmId;
	}

	/**
	 * qestnrQesitmId attribute ???????.
	 * @return qestnrQesitmId String
	 **/
	public void setQestnrQesitmId(String qestnrQesitmId) {
		this.qestnrQesitmId = qestnrQesitmId;
	}

	/**
	 * qestnrId attribute ?????.
	 * @return the String
	 **/
	public String getQestnrId() {
		return qestnrId;
	}

	/**
	 * qestnrId attribute ???????.
	 * @return qestnrId String
	 **/
	public void setQestnrId(String qestnrId) {
		this.qestnrId = qestnrId;
	}

	/**
	 * iemSn attribute ?????.
	 * @return the String
	 **/
	public String getIemSn() {
		return iemSn;
	}

	/**
	 * iemSn attribute ???????.
	 * @return iemSn String
	 **/
	public void setIemSn(String iemSn) {
		this.iemSn = iemSn;
	}

	/**
	 * qustnrIemId attribute ?????.
	 * @return the String
	 **/
	public String getQustnrIemId() {
		return qustnrIemId;
	}

	/**
	 * qustnrIemId attribute ???????.
	 * @return qustnrIemId String
	 **/
	public void setQustnrIemId(String qustnrIemId) {
		this.qustnrIemId = qustnrIemId;
	}

	/**
	 * iemCn attribute ?????.
	 * @return the String
	 **/
	public String getIemCn() {
		return iemCn;
	}

	/**
	 * iemCn attribute ???????.
	 * @return iemCn String
	 **/
	public void setIemCn(String iemCn) {
		this.iemCn = iemCn;
	}

	/**
	 * etcAnswerAt attribute ?????.
	 * @return the String
	 **/
	public String getEtcAnswerAt() {
		return etcAnswerAt;
	}

	/**
	 * etcAnswerAt attribute ???????.
	 * @return etcAnswerAt String
	 **/
	public void setEtcAnswerAt(String etcAnswerAt) {
		this.etcAnswerAt = etcAnswerAt;
	}

	/**
	 * qestnrTmplatId attribute ?????.
	 * @return the String
	 **/
	public String getQestnrTmplatId() {
		return qestnrTmplatId;
	}

	/**
	 * qestnrTmplatId attribute ???????.
	 * @return qestnrTmplatId String
	 **/
	public void setQestnrTmplatId(String qestnrTmplatId) {
		this.qestnrTmplatId = qestnrTmplatId;
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
