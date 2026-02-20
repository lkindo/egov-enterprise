package egovframework.com.sym.ccm.adc.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;

/**
 * ?됱젙肄붾뱶 紐⑤뜽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??		理쒖큹 ?앹꽦
 *   2024.10.29  沅뚰깭??		?꾩닔媛?BindingResult 寃利앹쓣 ?꾪븳 @NotEmpty 異붽?
 *
 * </pre>
 */
public class AdministCode implements Serializable {

	private static final long serialVersionUID = -3716488129294074398L;

	/*
	 * ?됱젙援ъ뿭援щ텇
	 */
	@NotEmpty(message = "?됱젙援ъ뿭援щ텇{common.required.msg}")
    private String administZoneSe = "";

    /*
     * ?됱젙援ъ뿭肄붾뱶
     */
	@NotEmpty(message = "?됱젙援ъ뿭肄붾뱶{common.required.msg}")
    private String administZoneCode = "";

    /*
     * ?됱젙援ъ뿭紐?
     */
	@NotEmpty(message = "?됱젙援ъ뿭紐?common.required.msg}")
	private String administZoneNm = "";

	/*
	 * ?곸쐞?됱젙援ъ뿭肄붾뱶
	 */
    private String upperAdministZoneCode = "";

	/*
	 * ?곸쐞?됱젙援ъ뿭紐?
	 */
    private String upperAdministZoneNm = "";

    /*
	 * ?앹꽦?쇱옄
	 */
	@NotEmpty(message = "?앹꽦?쇱옄{common.required.msg}")
    private String creatDe = "";

    /*
	 * ?먭린?쇱옄
	 */
    private String ablDe = "";

    /*
	 * ?ъ슜?щ?
	 */
	@NotEmpty(message = "?ъ슜?щ?{common.required.msg}")
    private String useAt = "";

    /*
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";

    /*
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId   = "";

	/**
	 * administZoneSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneSe() {
		return administZoneSe;
	}

	/**
	 * administZoneSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneSe String
	 */
	public void setAdministZoneSe(String administZoneSe) {
		this.administZoneSe = administZoneSe;
	}

	/**
	 * administZoneCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneCode() {
		return administZoneCode;
	}

	/**
	 * administZoneCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneCode String
	 */
	public void setAdministZoneCode(String administZoneCode) {
		this.administZoneCode = administZoneCode;
	}

	/**
	 * administZoneNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneNm() {
		return administZoneNm;
	}

	/**
	 * administZoneNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneNm String
	 */
	public void setAdministZoneNm(String administZoneNm) {
		this.administZoneNm = administZoneNm;
	}

	/**
	 * upperAdministZoneCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperAdministZoneCode() {
		return upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperAdministZoneCode String
	 */
	public void setUpperAdministZoneCode(String upperAdministZoneCode) {
		this.upperAdministZoneCode = upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperAdministZoneNm() {
		return upperAdministZoneNm;
	}

	/**
	 * upperAdministZoneNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperAdministZoneNm String
	 */
	public void setUpperAdministZoneNm(String upperAdministZoneNm) {
		this.upperAdministZoneNm = upperAdministZoneNm;
	}

	/**
	 * creatDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCreatDe() {
		return creatDe;
	}

	/**
	 * creatDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param creatDe String
	 */
	public void setCreatDe(String creatDe) {
		this.creatDe = creatDe;
	}

	/**
	 * ablDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAblDe() {
		return ablDe;
	}

	/**
	 * ablDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ablDe String
	 */
	public void setAblDe(String ablDe) {
		this.ablDe = ablDe;
	}

	/**
	 * useAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useAt String
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
