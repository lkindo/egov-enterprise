/**
 * 媛쒖슂
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫???먮즺?댁슜?꾪솴ID,寃뚯떆?륤D,寃뚯떆湲ID,?먮즺紐??먮즺?댁슜?잛닔) ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 09-8-2009 ?ㅽ썑 2:09:15
 */

package egovframework.com.sts.dst.service;

import egovframework.com.cmm.ComDefaultVO;

public class DtaUseStats extends ComDefaultVO {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?먮즺?댁슜?꾪솴ID
	 */
    private String dtaUseStatsId;
	/**
	 * 寃뚯떆?륤D
	 */
    private String bbsId;
	/**
	 * 寃뚯떆?먮챸
	 */
    private String bbsNm;    
	/**
	 * 寃뚯떆湲ID
	 */
    private String nttId;
	/**
	 * 寃뚯떆湲 ?쒕ぉ
	 */
    private String nttSj;
	/**
	 * 泥⑤??뚯씪ID
	 */
    private String atchFileId;
	/**
	 * ?뚯씪?곕쾲
	 */
    private String fileSn;
	/**
	 * ?ㅼ슫?잛닔
	 */
    private String downCnt;    
	/**
	 * ?뚯씪紐?
	 */
    private String fileNm;
	/**
	 * ?ъ슜?륤D
	 */
    private String userId;
	/**
	 * ?ъ슜?먮챸
	 */
    private String userNm;    
	/**
	 * ?깅줉?쇱옄
	 */
    private String regdate;
	/**
	 * 洹몃옒?꾩슜 ?깅줉?쇱옄
	 */
	private String grpRegDate;
	/**
	 * 洹몃옒?꾩슜 ?깅줉?쇱옄 移댁슫??
	 */
	private String grpCnt;

	/**
	 * @return the dtaUseStatsId
	 */
	public String getDtaUseStatsId() {
		return dtaUseStatsId;
	}
	/**
	 * @param dtaUseStatsId the dtaUseStatsId to set
	 */
	public void setDtaUseStatsId(String dtaUseStatsId) {
		this.dtaUseStatsId = dtaUseStatsId;
	}
	/**
	 * @return the bbsId
	 */
	public String getBbsId() {
		return bbsId;
	}
	/**
	 * @param bbsId the bbsId to set
	 */
	public void setBbsId(String bbsId) {
		this.bbsId = bbsId;
	}
	/**
	 * @return the bbsNm
	 */
	public String getBbsNm() {
		return bbsNm;
	}
	/**
	 * @param bbsNm the bbsNm to set
	 */
	public void setBbsNm(String bbsNm) {
		this.bbsNm = bbsNm;
	}
	/**
	 * @return the nttId
	 */
	public String getNttId() {
		return nttId;
	}
	/**
	 * @param nttId the nttId to set
	 */
	public void setNttId(String nttId) {
		this.nttId = nttId;
	}
	/**
	 * @return the nttSj
	 */
	public String getNttSj() {
		return nttSj;
	}
	/**
	 * @param nttSj the nttSj to set
	 */
	public void setNttSj(String nttSj) {
		this.nttSj = nttSj;
	}
	/**
	 * @return the atchFileId
	 */
	public String getAtchFileId() {
		return atchFileId;
	}
	/**
	 * @param atchFileId the atchFileId to set
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}
	/**
	 * @return the fileSn
	 */
	public String getFileSn() {
		return fileSn;
	}
	/**
	 * @param fileSn the fileSn to set
	 */
	public void setFileSn(String fileSn) {
		this.fileSn = fileSn;
	}
	/**
	 * @return the downCnt
	 */
	public String getDownCnt() {
		return downCnt;
	}
	/**
	 * @param downCnt the downCnt to set
	 */
	public void setDownCnt(String downCnt) {
		this.downCnt = downCnt;
	}
	/**
	 * @return the fileNm
	 */
	public String getFileNm() {
		return fileNm;
	}
	/**
	 * @param fileNm the fileNm to set
	 */
	public void setFileNm(String fileNm) {
		this.fileNm = fileNm;
	}
	/**
	 * @return the userId
	 */
	public String getUserId() {
		return userId;
	}
	/**
	 * @param userId the userId to set
	 */
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * @return the userNm
	 */
	public String getUserNm() {
		return userNm;
	}
	/**
	 * @param userNm the userNm to set
	 */
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * @return the regdate
	 */
	public String getRegdate() {
		return regdate;
	}
	/**
	 * @param regdate the regdate to set
	 */
	public void setRegdate(String regdate) {
		this.regdate = regdate;
	}
	/**
	 * @return the grpRegDate
	 */
	public String getGrpRegDate() {
		return grpRegDate;
	}
	/**
	 * @param grpRegDate the grpRegDate to set
	 */
	public void setGrpRegDate(String grpRegDate) {
		this.grpRegDate = grpRegDate;
	}
	/**
	 * @return the grpCnt
	 */
	public String getGrpCnt() {
		return grpCnt;
	}
	/**
	 * @param grpCnt the grpCnt to set
	 */
	public void setGrpCnt(String grpCnt) {
		this.grpCnt = grpCnt;
	}   
}
