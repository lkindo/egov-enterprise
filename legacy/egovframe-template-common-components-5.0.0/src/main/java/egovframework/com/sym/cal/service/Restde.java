package egovframework.com.sym.cal.service;

import java.io.Serializable;

import jakarta.validation.constraints.NotEmpty;

/**
 * ?댁씪 紐⑤뜽 ?대옒??
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
 *   2024.10.20  沅뚰깭??	?꾩닔媛?BindingResult 寃利앹쓣 ?꾪븳 @NotEmpty 異붽?
 *
 * </pre>
 */
public class Restde implements Serializable {

	private static final long serialVersionUID = -8509545779844669658L;

	/*
	 * ?댁씪踰덊샇
	 */
    private int    restdeNo       = 0;

    /*
     * ?댁씪?쇱옄
     */
	@NotEmpty(message = "?댁씪?쇱옄{common.required.msg}")
    private String restdeDe       = "";

    /*
     * ?댁씪紐?
     */
	@NotEmpty(message = "?댁씪紐?common.required.msg}")
    private String restdeNm       = "";

    /*
     * ?댁씪?ㅻ챸
     */
	@NotEmpty(message = "?댁씪?ㅻ챸{common.required.msg}")
    private String restdeDc       = "";

    /*
     * ?댁씪援щ텇
     */
	@NotEmpty(message = "?댁씪援щ텇{common.required.msg}")
    private String restdeSe       = "";

    /*
     * ?댁씪援щ텇肄붾뱶
     */
    private String restdeSeCode   = "";

    /*
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";

    /*
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId   = "";

    /*
     * ??
     */
    private String year           = "";

    /*
     * ??
     */
    private String month          = "";

    /*
     * ??
     */
    private String day            = "";

    /*
     * ?댁씪?щ?
     */
    private String restdeAt       = "";

    /*
     * ?щ젰?
     */
	private int    cellNum        = 0;

	/*
	 * ?붾퀎 二쇱닚??
	 */
    private int    weeks          = 0;

    /*
     * ??二쇱닔
     */
    private int maxWeeks = 0;

    /*
     * ?붿씪
     */
    private int    week           = 0;

    /*
     * ?쒖옉?붿씪
     */
    private int    startWeekMonth = 0;

    /*
     * 留덉?留??쇱옄
     */
    private int    lastDayMonth   = 0;

	/**
	 * restdeNo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getRestdeNo() {
		return restdeNo;
	}

	/**
	 * restdeNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeNo int
	 */
	public void setRestdeNo(int restdeNo) {
		this.restdeNo = restdeNo;
	}

	/**
	 * restdeDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeDe() {
		return restdeDe;
	}

	/**
	 * restdeDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeDe String
	 */
	public void setRestdeDe(String restdeDe) {
		this.restdeDe = restdeDe;
	}

	/**
	 * restdeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeNm() {
		return restdeNm;
	}

	/**
	 * restdeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeNm String
	 */
	public void setRestdeNm(String restdeNm) {
		this.restdeNm = restdeNm;
	}

	/**
	 * restdeDc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeDc() {
		return restdeDc;
	}

	/**
	 * restdeDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeDc String
	 */
	public void setRestdeDc(String restdeDc) {
		this.restdeDc = restdeDc;
	}

	/**
	 * restdeSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeSe() {
		return restdeSe;
	}

	/**
	 * restdeSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeSe String
	 */
	public void setRestdeSe(String restdeSe) {
		this.restdeSe = restdeSe;
	}

	/**
	 * restdeSeCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeSeCode() {
		return restdeSeCode;
	}

	/**
	 * restdeSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeSeCode String
	 */
	public void setRestdeSeCode(String restdeSeCode) {
		this.restdeSeCode = restdeSeCode;
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

	/**
	 * year attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getYear() {
		return year;
	}

	/**
	 * year attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param year String
	 */
	public void setYear(String year) {
		this.year = year;
	}

	/**
	 * month attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMonth() {
		return month;
	}

	/**
	 * month attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param month String
	 */
	public void setMonth(String month) {
		this.month = month;
	}

	/**
	 * day attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDay() {
		return day;
	}

	/**
	 * day attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param day String
	 */
	public void setDay(String day) {
		this.day = day;
	}

	/**
	 * restdeAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRestdeAt() {
		return restdeAt;
	}

	/**
	 * restdeAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param restdeAt String
	 */
	public void setRestdeAt(String restdeAt) {
		this.restdeAt = restdeAt;
	}

	/**
	 * cellNum attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getCellNum() {
		return cellNum;
	}

	/**
	 * cellNum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cellNum int
	 */
	public void setCellNum(int cellNum) {
		this.cellNum = cellNum;
	}

	/**
	 * weeks attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getWeeks() {
		return weeks;
	}

	/**
	 * weeks attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param weeks int
	 */
	public void setWeeks(int weeks) {
		this.weeks = weeks;
	}

	/**
	 * maxWeeks attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getMaxWeeks() {
		return maxWeeks;
	}

	/**
	 * maxWeeks attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param maxWeeks int
	 */
	public void setMaxWeeks(int maxWeeks) {
		this.maxWeeks = maxWeeks;
	}

	/**
	 * week attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getWeek() {
		return week;
	}

	/**
	 * week attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param week int
	 */
	public void setWeek(int week) {
		this.week = week;
	}

	/**
	 * startWeekMonth attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getStartWeekMonth() {
		return startWeekMonth;
	}

	/**
	 * startWeekMonth attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param startWeekMonth int
	 */
	public void setStartWeekMonth(int startWeekMonth) {
		this.startWeekMonth = startWeekMonth;
	}

	/**
	 * lastDayMonth attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getLastDayMonth() {
		return lastDayMonth;
	}

	/**
	 * lastDayMonth attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastDayMonth int
	 */
	public void setLastDayMonth(int lastDayMonth) {
		this.lastDayMonth = lastDayMonth;
	}

	/**
	 * restdeDe 媛믪쓣 "yyyy-mm-dd" ?뺤떇?쇰줈 諛섑솚?쒕떎.
	 * @return
	 */
	public String getFormattedRestdeDe() {
		if (restdeDe != null && restdeDe.length() == 8 && restdeDe.matches("\\d{8}")) {
			String year = restdeDe.substring(0, 4);
			String month = restdeDe.substring(4, 6);
			String day = restdeDe.substring(6, 8);
			return year + "-" + month + "-" + day;
		} else {
			return restdeDe;
		}
	}

}
