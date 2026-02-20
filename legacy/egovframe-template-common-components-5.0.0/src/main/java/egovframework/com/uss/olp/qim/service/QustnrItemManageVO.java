package egovframework.com.uss.olp.qim.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;
/**
 * ?ㅻЦ??ぉ愿由?VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??		理쒖큹 ?앹꽦
 *   2024.10.29  沅뚰깭??		?꾩닔媛?BindingResult 寃利앹쓣 ?꾪븳 @NotEmpty 異붽?
 *
 * </pre>
 */
public class QustnrItemManageVO implements Serializable {

	private static final long serialVersionUID = -8233519594470362395L;

	/** ?ㅻЦ臾명빆 ?꾩씠??*/
	private String qestnrQesitmId = "";

	/** ?ㅻЦ吏 ?꾩씠??*/
	@NotEmpty(message = "?ㅻЦ?뺣낫{common.required.msg}")
	private String qestnrId = "";

	/** ??ぉ?쒕쾲 */
	@NotEmpty(message = "??ぉ?쒕쾲{common.required.msg}")
	private String iemSn = "";

	/** ??ぉ?댁슜 */
	@NotEmpty(message = "??ぉ?댁슜{common.required.msg}")
	private String qustnrIemId = "";

	/** ?ㅻЦ??ぉ?꾩씠??*/
	private String iemCn = "";

	/** 湲고??듬??щ? */
	@NotEmpty(message = "湲고??듬??щ?{common.required.msg}")
	private String etcAnswerAt = "";

	/** ?ㅻЦ??ぉ(??瑜??꾩씠??*/
	@NotEmpty(message = "?ㅻЦ臾명빆?뺣낫{common.required.msg}")
	private String qestnrTmplatId = "";

	/** 理쒖큹?깅줉?쒖젏  */
	private String frstRegisterPnttm = "";

	/** 理쒖큹?깅줉?꾩씠??*/
	private String frstRegisterId = "";

	/** 理쒖쥌?섏젙??*/
	private String lastUpdusrPnttm = "";

	/** 理쒖쥌?섏젙???꾩씠??*/
	private String lastUpdusrId = "";

	/** 而⑦듃濡?紐낅졊??*/
	private String cmd = "";

	/**
	 * qestnrQesitmId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrQesitmId() {
		return qestnrQesitmId;
	}

	/**
	 * qestnrQesitmId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrQesitmId String
	 */
	public void setQestnrQesitmId(String qestnrQesitmId) {
		this.qestnrQesitmId = qestnrQesitmId;
	}

	/**
	 * qestnrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrId() {
		return qestnrId;
	}

	/**
	 * qestnrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrId String
	 */
	public void setQestnrId(String qestnrId) {
		this.qestnrId = qestnrId;
	}

	/**
	 * iemSn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getIemSn() {
		return iemSn;
	}

	/**
	 * iemSn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return iemSn String
	 */
	public void setIemSn(String iemSn) {
		this.iemSn = iemSn;
	}

	/**
	 * qustnrIemId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQustnrIemId() {
		return qustnrIemId;
	}

	/**
	 * qustnrIemId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qustnrIemId String
	 */
	public void setQustnrIemId(String qustnrIemId) {
		this.qustnrIemId = qustnrIemId;
	}

	/**
	 * iemCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getIemCn() {
		return iemCn;
	}

	/**
	 * iemCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return iemCn String
	 */
	public void setIemCn(String iemCn) {
		this.iemCn = iemCn;
	}

	/**
	 * etcAnswerAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEtcAnswerAt() {
		return etcAnswerAt;
	}

	/**
	 * etcAnswerAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return etcAnswerAt String
	 */
	public void setEtcAnswerAt(String etcAnswerAt) {
		this.etcAnswerAt = etcAnswerAt;
	}

	/**
	 * qestnrTmplatId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrTmplatId() {
		return qestnrTmplatId;
	}

	/**
	 * qestnrTmplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrTmplatId String
	 */
	public void setQestnrTmplatId(String qestnrTmplatId) {
		this.qestnrTmplatId = qestnrTmplatId;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return cmd String
	 */
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}


}
