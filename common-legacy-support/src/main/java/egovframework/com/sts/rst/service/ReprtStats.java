package egovframework.com.sts.rst.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??
 * - ?????????model ?????? ???.
 * 
 * ???
 * - ?????? ???, ???, ??????????????
 * 
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?? 2:09:15
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2009.8.3	lee.m.j		???? *  
 *  2011.8.26	???	IncludedInfo annotation ??
 *
 *          </pre>
 **/

public class ReprtStats extends ComDefaultVO {

	/** serialVersionUID **/
	private static final long serialVersionUID = 1L;
	/** ??? **/
	private String reprtId;
	/** ??? **/
	private String reprtNm;
	/** ??????**/
	private String reprtTy;
	/** ????? **/
	private String reprtTyNm;
	/** ?????**/
	private String reprtSttus;
	/** ????? **/
	private String reprtSttusNm;
	/** ??????**/
	private String cnt;
	/** ?????ID **/
	private String userId;
	/** ??? **/
	private String regDate;
	/** ?? ??? **/
	private String grpRegDate;
	/** ?? ??? ???**/
	private String grpCnt;
	/** ?? ??????**/
	private String grpReprtTy;
	/** ?? ????? **/
	private String grpReprtTyNm;
	/** ?? ?????????**/
	private String grpReprtTyCnt;
	/** ?? ? **/
	private String grpReprtSttus;
	/** ?? ??**/
	private String grpReprtSttusNm;
	/** ?? ? ???**/
	private String grpReprtSttusCnt;
	/** ??????**/
	private String statsKind;
	/** ???ID **/
	private String frstRegisterId;
	/** ??? **/
	private String frstRegistPnttm;

	/**
	 * @return the reprtId
	 **/
	public String getReprtId() {
		return reprtId;
	}

	/**
	 * @param reprtId the reprtId to set
	 **/
	public void setReprtId(String reprtId) {
		this.reprtId = reprtId;
	}

	/**
	 * @return the reprtNm
	 **/
	public String getReprtNm() {
		return reprtNm;
	}

	/**
	 * @param reprtNm the reprtNm to set
	 **/
	public void setReprtNm(String reprtNm) {
		this.reprtNm = reprtNm;
	}

	/**
	 * @return the reprtTy
	 **/
	public String getReprtTy() {
		return reprtTy;
	}

	/**
	 * @param reprtTy the reprtTy to set
	 **/
	public void setReprtTy(String reprtTy) {
		this.reprtTy = reprtTy;
	}

	/**
	 * @return the reprtTyNm
	 **/
	public String getReprtTyNm() {
		return reprtTyNm;
	}

	/**
	 * @param reprtTyNm the reprtTyNm to set
	 **/
	public void setReprtTyNm(String reprtTyNm) {
		this.reprtTyNm = reprtTyNm;
	}

	/**
	 * @return the reprtSttus
	 **/
	public String getReprtSttus() {
		return reprtSttus;
	}

	/**
	 * @param reprtSttus the reprtSttus to set
	 **/
	public void setReprtSttus(String reprtSttus) {
		this.reprtSttus = reprtSttus;
	}

	/**
	 * @return the reprtSttusNm
	 **/
	public String getReprtSttusNm() {
		return reprtSttusNm;
	}

	/**
	 * @param reprtSttusNm the reprtSttusNm to set
	 **/
	public void setReprtSttusNm(String reprtSttusNm) {
		this.reprtSttusNm = reprtSttusNm;
	}

	/**
	 * @return the cnt
	 **/
	public String getCnt() {
		return cnt;
	}

	/**
	 * @param cnt the cnt to set
	 **/
	public void setCnt(String cnt) {
		this.cnt = cnt;
	}

	/**
	 * @return the userId
	 **/
	public String getUserId() {
		return userId;
	}

	/**
	 * @param userId the userId to set
	 **/
	public void setUserId(String userId) {
		this.userId = userId;
	}

	/**
	 * @return the regDate
	 **/
	public String getRegDate() {
		return regDate;
	}

	/**
	 * @param regDate the regDate to set
	 **/
	public void setRegDate(String regDate) {
		this.regDate = regDate;
	}

	/**
	 * @return the grpRegDate
	 **/
	public String getGrpRegDate() {
		return grpRegDate;
	}

	/**
	 * @param grpRegDate the grpRegDate to set
	 **/
	public void setGrpRegDate(String grpRegDate) {
		this.grpRegDate = grpRegDate;
	}

	/**
	 * @return the grpCnt
	 **/
	public String getGrpCnt() {
		return grpCnt;
	}

	/**
	 * @param grpCnt the grpCnt to set
	 **/
	public void setGrpCnt(String grpCnt) {
		this.grpCnt = grpCnt;
	}

	/**
	 * @return the grpReprtTy
	 **/
	public String getGrpReprtTy() {
		return grpReprtTy;
	}

	/**
	 * @param grpReprtTy the grpReprtTy to set
	 **/
	public void setGrpReprtTy(String grpReprtTy) {
		this.grpReprtTy = grpReprtTy;
	}

	/**
	 * @return the grpReprtTyNm
	 **/
	public String getGrpReprtTyNm() {
		return grpReprtTyNm;
	}

	/**
	 * @param grpReprtTyNm the grpReprtTyNm to set
	 **/
	public void setGrpReprtTyNm(String grpReprtTyNm) {
		this.grpReprtTyNm = grpReprtTyNm;
	}

	/**
	 * @return the grpReprtTyCnt
	 **/
	public String getGrpReprtTyCnt() {
		return grpReprtTyCnt;
	}

	/**
	 * @param grpReprtTyCnt the grpReprtTyCnt to set
	 **/
	public void setGrpReprtTyCnt(String grpReprtTyCnt) {
		this.grpReprtTyCnt = grpReprtTyCnt;
	}

	/**
	 * @return the grpReprtSttus
	 **/
	public String getGrpReprtSttus() {
		return grpReprtSttus;
	}

	/**
	 * @param grpReprtSttus the grpReprtSttus to set
	 **/
	public void setGrpReprtSttus(String grpReprtSttus) {
		this.grpReprtSttus = grpReprtSttus;
	}

	/**
	 * @return the grpReprtSttusNm
	 **/
	public String getGrpReprtSttusNm() {
		return grpReprtSttusNm;
	}

	/**
	 * @param grpReprtSttusNm the grpReprtSttusNm to set
	 **/
	public void setGrpReprtSttusNm(String grpReprtSttusNm) {
		this.grpReprtSttusNm = grpReprtSttusNm;
	}

	/**
	 * @return the grpReprtSttusCnt
	 **/
	public String getGrpReprtSttusCnt() {
		return grpReprtSttusCnt;
	}

	/**
	 * @return the statsKind
	 **/
	public String getStatsKind() {
		return statsKind;
	}

	/**
	 * @param statsKind the statsKind to set
	 **/
	public void setStatsKind(String statsKind) {
		this.statsKind = statsKind;
	}

	/**
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the frstRegistPnttm
	 **/
	public String getFrstRegistPnttm() {
		return frstRegistPnttm;
	}

	/**
	 * @param frstRegistPnttm the frstRegistPnttm to set
	 **/
	public void setFrstRegistPnttm(String frstRegistPnttm) {
		this.frstRegistPnttm = frstRegistPnttm;
	}
}
