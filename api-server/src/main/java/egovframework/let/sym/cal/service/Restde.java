package egovframework.let.sym.cal.service;

import java.io.Serializable;

/**
 * 휴일 모델 클래스
 */
public class Restde implements Serializable {

    private static final long serialVersionUID = 1L;

    private int restdeNo = 0;
    private String restdeDe = "";
    private String restdeNm = "";
    private String restdeDc = "";
    private String restdeSe = "";
    private String restdeSeCode = "";
    private String frstRegisterId = "";
    private String lastUpdusrId = "";
    private String year = "";
    private String month = "";
    private String day = "";
    private String restdeAt = "";
    private int cellNum = 0;
    private int weeks = 0;
    private int maxWeeks = 0;
    private int week = 0;
    private int startWeekMonth = 0;
    private int lastDayMonth = 0;

    // Getters and Setters
    public int getRestdeNo() {
        return restdeNo;
    }

    public void setRestdeNo(int restdeNo) {
        this.restdeNo = restdeNo;
    }

    public String getRestdeDe() {
        return restdeDe;
    }

    public void setRestdeDe(String restdeDe) {
        this.restdeDe = restdeDe;
    }

    public String getRestdeNm() {
        return restdeNm;
    }

    public void setRestdeNm(String restdeNm) {
        this.restdeNm = restdeNm;
    }

    public String getRestdeDc() {
        return restdeDc;
    }

    public void setRestdeDc(String restdeDc) {
        this.restdeDc = restdeDc;
    }

    public String getRestdeSe() {
        return restdeSe;
    }

    public void setRestdeSe(String restdeSe) {
        this.restdeSe = restdeSe;
    }

    public String getRestdeSeCode() {
        return restdeSeCode;
    }

    public void setRestdeSeCode(String restdeSeCode) {
        this.restdeSeCode = restdeSeCode;
    }

    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public String getRestdeAt() {
        return restdeAt;
    }

    public void setRestdeAt(String restdeAt) {
        this.restdeAt = restdeAt;
    }

    public int getCellNum() {
        return cellNum;
    }

    public void setCellNum(int cellNum) {
        this.cellNum = cellNum;
    }

    public int getWeeks() {
        return weeks;
    }

    public void setWeeks(int weeks) {
        this.weeks = weeks;
    }

    public int getMaxWeeks() {
        return maxWeeks;
    }

    public void setMaxWeeks(int maxWeeks) {
        this.maxWeeks = maxWeeks;
    }

    public int getWeek() {
        return week;
    }

    public void setWeek(int week) {
        this.week = week;
    }

    public int getStartWeekMonth() {
        return startWeekMonth;
    }

    public void setStartWeekMonth(int startWeekMonth) {
        this.startWeekMonth = startWeekMonth;
    }

    public int getLastDayMonth() {
        return lastDayMonth;
    }

    public void setLastDayMonth(int lastDayMonth) {
        this.lastDayMonth = lastDayMonth;
    }
}
