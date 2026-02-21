package egovframework.com.sym.ccm.adc.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;

/**
 * ???????????
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????		????
 *   2024.10.29  ??		??BindingResult ??? @NotEmpty ??
 *
 * </pre>
 **/
public class AdministCode implements Serializable {

	private static final long serialVersionUID = -3716488129294074398L;

	/*
	 * ????
	 */
	@NotEmpty(message = "??      ?         ?         {common.required.msg}")
    private String administZoneSe = "";

    /*
     * ?????
     */
	@NotEmpty(message = "??      ?         ?         ?common.required.msg}")
    private String administZoneCode = "";

    /*
     * ????
     */
	@NotEmpty(message = "??      ?            ?common.required.msg}")
	private String administZoneNm = "";

	/*
	 * ??????
	 */
    private String upperAdministZoneCode = "";

	/*
	 * ?????
	 */
    private String upperAdministZoneNm = "";

    /*
	 * ????
	 */
	@NotEmpty(message = "??      ??      {common.required.msg}")
    private String creatDe = "";

    /*
	 * ????
	 */
    private String ablDe = "";

    /*
	 * ??????
	 */
	@NotEmpty(message = "??????{common.required.msg}")
    private String useAt = "";

    /*
     * ???
     */
    private String frstRegisterId = "";

    /*
     * ???
     */
    private String lastUpdusrId   = "";

	/**
	 * administZoneSe attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneSe() {
		return administZoneSe;
	}

	/**
	 * administZoneSe attribute ???????.
	 * @param administZoneSe String
	 **/
	public void setAdministZoneSe(String administZoneSe) {
		this.administZoneSe = administZoneSe;
	}

	/**
	 * administZoneCode attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneCode() {
		return administZoneCode;
	}

	/**
	 * administZoneCode attribute ???????.
	 * @param administZoneCode String
	 **/
	public void setAdministZoneCode(String administZoneCode) {
		this.administZoneCode = administZoneCode;
	}

	/**
	 * administZoneNm attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneNm() {
		return administZoneNm;
	}

	/**
	 * administZoneNm attribute ???????.
	 * @param administZoneNm String
	 **/
	public void setAdministZoneNm(String administZoneNm) {
		this.administZoneNm = administZoneNm;
	}

	/**
	 * upperAdministZoneCode attribute ?????.
	 * @return String
	 **/
	public String getUpperAdministZoneCode() {
		return upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneCode attribute ???????.
	 * @param upperAdministZoneCode String
	 **/
	public void setUpperAdministZoneCode(String upperAdministZoneCode) {
		this.upperAdministZoneCode = upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneNm attribute ?????.
	 * @return String
	 **/
	public String getUpperAdministZoneNm() {
		return upperAdministZoneNm;
	}

	/**
	 * upperAdministZoneNm attribute ???????.
	 * @param upperAdministZoneNm String
	 **/
	public void setUpperAdministZoneNm(String upperAdministZoneNm) {
		this.upperAdministZoneNm = upperAdministZoneNm;
	}

	/**
	 * creatDe attribute ?????.
	 * @return String
	 **/
	public String getCreatDe() {
		return creatDe;
	}

	/**
	 * creatDe attribute ???????.
	 * @param creatDe String
	 **/
	public void setCreatDe(String creatDe) {
		this.creatDe = creatDe;
	}

	/**
	 * ablDe attribute ?????.
	 * @return String
	 **/
	public String getAblDe() {
		return ablDe;
	}

	/**
	 * ablDe attribute ???????.
	 * @param ablDe String
	 **/
	public void setAblDe(String ablDe) {
		this.ablDe = ablDe;
	}

	/**
	 * useAt attribute ?????.
	 * @return String
	 **/
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute ???????.
	 * @param useAt String
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * @return String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * @param frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * @return String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * @param lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
