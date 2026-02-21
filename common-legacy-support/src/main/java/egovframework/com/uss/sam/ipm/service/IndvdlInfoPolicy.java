package egovframework.com.uss.sam.ipm.service;

import java.io.Serializable;

/**
 * ???? VO Class ?
 * 
 * @author ?????????
 * @since 2009.07.03
 * @version 1.0
 * @see
 * 
 *      <pre>
 * &lt;&lt; ?????Modification Information) &gt;&gt;
 *
 *   ????         ????      ????
 *  -----------    --------    ---------------------------
 *   2009.07.03     ???      ????
 *
 *      </pre>
 **/
public class IndvdlInfoPolicy implements Serializable {

	private static final long serialVersionUID = 2087042986899364386L;

	/** ???? ???**/
	private String indvdlInfoId;

	/** ???? ?**/
	private String indvdlInfoNm;

	/** ???? ?? **/
	private String indvdlInfoDc;

	/** ???? ????? **/
	private String indvdlInfoYn;

	/** ???? **/
	private String frstRegisterPnttm;

	/** ?????**/
	private String frstRegisterId;

	/** ????**/
	private String lastUpdusrPnttm;

	/** ???????**/
	private String lastUpdusrId;

	/** ?????**/
	private String cmd;

	/**
	 * indvdlInfoId ?
	 *
	 * @return the indvdlInfoId
	 **/
	public String getIndvdlInfoId() {
		return indvdlInfoId;
	}

	/**
	 * indvdlInfoId ??
	 *
	 * @param indvdlInfoId the indvdlInfoId to set
	 **/
	public void setIndvdlInfoId(String indvdlInfoId) {
		this.indvdlInfoId = indvdlInfoId;
	}

	/**
	 * indvdlInfoNm ?
	 *
	 * @return the indvdlInfoNm
	 **/
	public String getIndvdlInfoNm() {
		return indvdlInfoNm;
	}

	/**
	 * indvdlInfoNm ??
	 *
	 * @param indvdlInfoNm the indvdlInfoNm to set
	 **/
	public void setIndvdlInfoNm(String indvdlInfoNm) {
		this.indvdlInfoNm = indvdlInfoNm;
	}

	/**
	 * indvdlInfoDc ?
	 *
	 * @return the indvdlInfoDc
	 **/
	public String getIndvdlInfoDc() {
		return indvdlInfoDc;
	}

	/**
	 * indvdlInfoDc ??
	 *
	 * @param indvdlInfoDc the indvdlInfoDc to set
	 **/
	public void setIndvdlInfoDc(String indvdlInfoDc) {
		this.indvdlInfoDc = indvdlInfoDc;
	}

	/**
	 * indvdlInfoYn ?
	 *
	 * @return the indvdlInfoYn
	 **/
	public String getIndvdlInfoYn() {
		return indvdlInfoYn;
	}

	/**
	 * indvdlInfoYn ??
	 *
	 * @param indvdlInfoYn the indvdlInfoYn to set
	 **/
	public void setIndvdlInfoYn(String indvdlInfoYn) {
		this.indvdlInfoYn = indvdlInfoYn;
	}

	/**
	 * frstRegisterPnttm ?
	 *
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm ??
	 *
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId ?
	 *
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId ??
	 *
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm ?
	 *
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm ??
	 *
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId ?
	 *
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId ??
	 *
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd ?
	 *
	 * @return the cmd
	 **/
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd ??
	 *
	 * @param cmd the cmd to set
	 **/
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
