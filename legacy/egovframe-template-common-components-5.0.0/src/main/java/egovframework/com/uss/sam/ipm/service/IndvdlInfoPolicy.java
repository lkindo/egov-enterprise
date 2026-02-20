package egovframework.com.uss.sam.ipm.service;

import java.io.Serializable;

/**
 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 VO Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 * 
 *      <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.07.03     ?λ룞??      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
public class IndvdlInfoPolicy implements Serializable {

	private static final long serialVersionUID = 2087042986899364386L;

	/** 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?꾩씠??*/
	private String indvdlInfoId;

	/** 媛쒖씤?뺣낫蹂댄샇?뺤콉 紐?*/
	private String indvdlInfoNm;

	/** 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?댁슜 */
	private String indvdlInfoDc;

	/** 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?숈쓽?щ? */
	private String indvdlInfoYn;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?꾩씠??*/
	private String frstRegisterId;

	/** 理쒖쥌?섏젙??*/
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙???꾩씠??*/
	private String lastUpdusrId;

	/** 而⑦듃濡?紐낅졊??*/
	private String cmd;

	/**
	 * indvdlInfoId 由ы꽩
	 *
	 * @return the indvdlInfoId
	 */
	public String getIndvdlInfoId() {
		return indvdlInfoId;
	}

	/**
	 * indvdlInfoId ?ㅼ젙
	 *
	 * @param indvdlInfoId the indvdlInfoId to set
	 */
	public void setIndvdlInfoId(String indvdlInfoId) {
		this.indvdlInfoId = indvdlInfoId;
	}

	/**
	 * indvdlInfoNm 由ы꽩
	 *
	 * @return the indvdlInfoNm
	 */
	public String getIndvdlInfoNm() {
		return indvdlInfoNm;
	}

	/**
	 * indvdlInfoNm ?ㅼ젙
	 *
	 * @param indvdlInfoNm the indvdlInfoNm to set
	 */
	public void setIndvdlInfoNm(String indvdlInfoNm) {
		this.indvdlInfoNm = indvdlInfoNm;
	}

	/**
	 * indvdlInfoDc 由ы꽩
	 *
	 * @return the indvdlInfoDc
	 */
	public String getIndvdlInfoDc() {
		return indvdlInfoDc;
	}

	/**
	 * indvdlInfoDc ?ㅼ젙
	 *
	 * @param indvdlInfoDc the indvdlInfoDc to set
	 */
	public void setIndvdlInfoDc(String indvdlInfoDc) {
		this.indvdlInfoDc = indvdlInfoDc;
	}

	/**
	 * indvdlInfoYn 由ы꽩
	 *
	 * @return the indvdlInfoYn
	 */
	public String getIndvdlInfoYn() {
		return indvdlInfoYn;
	}

	/**
	 * indvdlInfoYn ?ㅼ젙
	 *
	 * @param indvdlInfoYn the indvdlInfoYn to set
	 */
	public void setIndvdlInfoYn(String indvdlInfoYn) {
		this.indvdlInfoYn = indvdlInfoYn;
	}

	/**
	 * frstRegisterPnttm 由ы꽩
	 *
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm ?ㅼ젙
	 *
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId 由ы꽩
	 *
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId ?ㅼ젙
	 *
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm 由ы꽩
	 *
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm ?ㅼ젙
	 *
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId 由ы꽩
	 *
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId ?ㅼ젙
	 *
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd 由ы꽩
	 *
	 * @return the cmd
	 */
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd ?ㅼ젙
	 *
	 * @param cmd the cmd to set
	 */
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
