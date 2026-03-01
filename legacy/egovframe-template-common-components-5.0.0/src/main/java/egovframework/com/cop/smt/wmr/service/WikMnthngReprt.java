package egovframework.com.cop.smt.wmr.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 二쇨컙?붽컙蹂닿퀬?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 蹂닿퀬?쏧D, 蹂닿퀬?쒓뎄遺? 蹂닿퀬?쒖젣紐? ?묒꽦?쇱옄, ?묒꽦?륤D, ?묒꽦?먮챸, ?묒꽦?먯쭅湲됰챸, 蹂닿퀬?륤D, 蹂닿퀬?먮챸, 蹂닿퀬?쒖옉?쇱옄, 蹂닿퀬醫낅즺?쇱옄,
 * 湲덉＜蹂닿퀬?댁슜, 李⑥＜蹂닿퀬?댁슜, ?뱀씠?ы빆, 泥⑤??뚯씪ID, ?뱀씤?쇱떆, 蹂닿퀬?쒖긽????ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:48
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class WikMnthngReprt implements Serializable{

	/** 蹂닿퀬?쏧D */
	private String reprtId;
	/** 蹂닿퀬?쒓뎄遺?*/
	private String reprtSe;
	/** 蹂닿퀬?쒖젣紐?*/
	private String reprtSj;
	/** 蹂닿퀬?쇱옄 */
	private String reprtDe;
	/** ?묒꽦?륤D */
	private String wrterId;
	/** ?묒꽦?먮챸 */
	private String wrterNm;
	/** ?묒꽦?먯쭅湲됰챸 */
	private String wrterClsfNm;
	/** 蹂닿퀬?륤D */
	private String reportrId;
	/** 蹂닿퀬?먮챸 */
	private String reportrNm;
	/** 蹂닿퀬?먯쭅湲됰챸 */
	private String reportrClsfNm;
	/** 蹂닿퀬?쒖옉?쇱옄 */
	private String reprtBgnDe;
	/** 蹂닿퀬醫낅즺?쇱옄 */
	private String reprtEndDe;
	/** 湲덉＜蹂닿퀬?댁슜 */
	private String reprtThswikCn;
	/** 李⑥＜蹂닿퀬?댁슜 */
	private String reprtLesseeCn;
	/** ?뱀씠?ы빆 */
	private String partclrMatter;
	/** 泥⑤??뚯씪ID */
	private String atchFileId;
	/** ?뱀씤?쇱떆 */
	private String confmDt;
	/** 蹂닿퀬?쒖긽??*/
	private String reprtSttus;
	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏*/
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";
	
	public String getReprtId() {
		return reprtId;
	}
	public void setReprtId(String reprtId) {
		this.reprtId = reprtId;
	}
	public String getReprtSe() {
		return reprtSe;
	}
	public void setReprtSe(String reprtSe) {
		this.reprtSe = reprtSe;
	}
	public String getReprtSj() {
		return reprtSj;
	}
	public void setReprtSj(String reprtSj) {
		this.reprtSj = reprtSj;
	}
	public String getReprtDe() {
		return reprtDe;
	}
	public void setReprtDe(String reprtDe) {
		this.reprtDe = reprtDe;
	}
	public String getWrterId() {
		return wrterId;
	}
	public void setWrterId(String wrterId) {
		this.wrterId = wrterId;
	}
	public String getWrterNm() {
		return wrterNm;
	}
	public void setWrterNm(String wrterNm) {
		this.wrterNm = wrterNm;
	}
	public String getWrterClsfNm() {
		return wrterClsfNm;
	}
	public void setWrterClsfNm(String wrterClsfNm) {
		this.wrterClsfNm = wrterClsfNm;
	}
	public String getReportrId() {
		return reportrId;
	}
	public void setReportrId(String reportrId) {
		this.reportrId = reportrId;
	}
	public String getReportrNm() {
		return reportrNm;
	}
	public void setReportrNm(String reportrNm) {
		this.reportrNm = reportrNm;
	}
	public String getReportrClsfNm() {
		return reportrClsfNm;
	}
	public void setReportrClsfNm(String reportrClsfNm) {
		this.reportrClsfNm = reportrClsfNm;
	}
	public String getReprtBgnDe() {
		return reprtBgnDe;
	}
	public void setReprtBgnDe(String reprtBgnDe) {
		this.reprtBgnDe = reprtBgnDe;
	}
	public String getReprtEndDe() {
		return reprtEndDe;
	}
	public void setReprtEndDe(String reprtEndDe) {
		this.reprtEndDe = reprtEndDe;
	}
	public String getReprtThswikCn() {
		return reprtThswikCn;
	}
	public void setReprtThswikCn(String reprtThswikCn) {
		this.reprtThswikCn = reprtThswikCn;
	}
	public String getReprtLesseeCn() {
		return reprtLesseeCn;
	}
	public void setReprtLesseeCn(String reprtLesseeCn) {
		this.reprtLesseeCn = reprtLesseeCn;
	}
	public String getPartclrMatter() {
		return partclrMatter;
	}
	public void setPartclrMatter(String partclrMatter) {
		this.partclrMatter = partclrMatter;
	}
	public String getAtchFileId() {
		return atchFileId;
	}
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}
	public String getConfmDt() {
		return confmDt;
	}
	public void setConfmDt(String confmDt) {
		this.confmDt = confmDt;
	}
	public String getReprtSttus() {
		return reprtSttus;
	}
	public void setReprtSttus(String reprtSttus) {
		this.reprtSttus = reprtSttus;
	}
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	
	
}
