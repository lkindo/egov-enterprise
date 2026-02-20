package egovframework.com.uss.olp.qtm.service;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * ?ㅻЦ?쒗뵆由?VO Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2025.08.26  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidArrayLoops(諛곗뿴??媛믪쓣 猷⑦봽臾몄쓣 ?댁슜?섏뿬 蹂듭궗?섎뒗 寃?蹂대떎, System.arraycopy() 硫붿냼?쒕? ?댁슜?섏뿬 蹂듭궗?섎뒗 寃껋씠 ?⑥쑉?곸씠硫??섑뻾 ?띾룄媛 鍮좊쫫)
 *
 *      </pre>
 */
public class QustnrTmplatManageVO implements Serializable {

	private static final long serialVersionUID = 4589288390515705950L;

	/** ?ㅻЦ?쒗뵆由??꾩씠??*/
	private String qestnrTmplatId = "";

	/** ?ㅻЦ?쒗뵆由??좏삎 */
	private String qestnrTmplatTy = "";

	/** ?ㅻЦ?쒗뵆 ?대?吏?댁슜 */
	@Getter
	@Setter
	private byte[] qestnrTmplatImagepathnm;

	/** ?ㅻЦ?쒗뵆由??ㅻ챸 */
	private String qestnrTmplatCn = "";

	/** ?ㅻЦ?쒗뵆由욧꼍濡쒕챸 */
	private String qestnrTmplatCours;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";

	/** 理쒖큹?깅줉?먯븘?대뵒 */
	private String frstRegisterId = "";

	/** 理쒖쥌?섏젙???쒖젏 */
	private String lastUpdusrPnttm = "";

	/** 理쒖쥌?섏젙?먯븘?대뵒 */
	private String lastUpdusrId = "";

	/** ?붾㈃ 紐낅졊 泥섎━ */
	private String cmd = "";

	/**
	 * qestnrTmplatId attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getQestnrTmplatId() {
		return qestnrTmplatId;
	}

	/**
	 * qestnrTmplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return qestnrTmplatId String
	 */
	public void setQestnrTmplatId(String qestnrTmplatId) {
		this.qestnrTmplatId = qestnrTmplatId;
	}

	/**
	 * qestnrTmplatTy attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getQestnrTmplatTy() {
		return qestnrTmplatTy;
	}

	/**
	 * qestnrTmplatTy attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return qestnrTmplatTy String
	 */
	public void setQestnrTmplatTy(String qestnrTmplatTy) {
		this.qestnrTmplatTy = qestnrTmplatTy;
	}

	/**
	 * qestnrTmplatCn attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getQestnrTmplatCn() {
		return qestnrTmplatCn;
	}

	/**
	 * qestnrTmplatCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return qestnrTmplatCn String
	 */
	public void setQestnrTmplatCn(String qestnrTmplatCn) {
		this.qestnrTmplatCn = qestnrTmplatCn;
	}

	/**
	 * qestnrTmplatCours attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getQestnrTmplatCours() {
		return qestnrTmplatCours;
	}

	/**
	 * qestnrTmplatCours attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return qestnrTmplatCours String
	 */
	public void setQestnrTmplatCours(String qestnrTmplatCours) {
		this.qestnrTmplatCours = qestnrTmplatCours;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return the String
	 */
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @return cmd String
	 */
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
