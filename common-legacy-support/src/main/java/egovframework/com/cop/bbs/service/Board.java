package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @Class Name : Board.java
 * @Description : ?? ???????????
 * @Modification Information
 * 
 *               ????????????
 *               ------- -------- ---------------------------
 *               2009.03.06 ????????
 *
 * @author ????????? ????
 * @since 2009. 02. 13
 * @version 1.0
 * @see
 * 
 **/
public class Board implements Serializable {

	private static final long serialVersionUID = 1L;

	/**
	 * ?????? ???
	 **/
	private String atchFileId = "";
	/**
	 * ??????
	 **/
	@NotBlank(message = "Required")
	private String bbsId = "";
	/**
	 * ???????
	 **/
	private String frstRegisterId = "";
	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";
	/**
	 * ???????
	 **/
	private String lastUpdusrId = "";
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm = "";
	/**
	 * ?????
	 **/
	private String ntceBgnde = "";
	/**
	 * ????
	 **/
	private String ntceEndde = "";
	/**
	 * ??????
	 **/
	private String ntcrId = "";
	/**
	 * ???
	 **/
	private String ntcrNm = "";
	/**
	 * ????
	 **/
	@NotBlank(message = "Required")
	@Size(max = 200, message = "Required")
	private String nttCn = "";
	/**
	 * ?????
	 **/
	private long nttId = 0L;
	/**
	 * ????
	 **/
	private long nttNo = 0L;
	/**
	 * ????
	 **/
	@NotBlank(message = "Required")
	@Size(max = 200, message = "Required")
	private String nttSj = "";
	/**
	 * ????
	 **/
	private String parnts = "0";
	/**
	 * ?????
	 **/
	private String password = "";
	/**
	 * ???
	 **/
	private int inqireCo = 0;
	/**
	 * ??????
	 **/
	private String replyAt = "";
	/**
	 * ????
	 **/
	private String replyLc = "0";
	/**
	 * ???
	 **/
	private long sortOrdr = 0L;
	/**
	 * ??????
	 **/
	private String useAt = "";
	/**
	 * ?????
	 **/
	private String ntceEnddeView = "";
	/**
	 * ??????
	 **/
	private String ntceBgndeView = "";
	/**
	 * ????????
	 **/
	private String noticeAt = "";
	/**
	 * ??? ???
	 **/
	private String secretAt = "";
	/**
	 * ?? Bold ???
	 **/
	private String sjBoldAt = "";
	/**
	 * ????????
	 **/
	private String blogAt = "";
	/** ??ID **/
	private String blogId = "";

	/**
	 * atchFileId attribute?????.
	 * 
	 * @return the atchFileId
	 **/
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute ???????.
	 * 
	 * @param atchFileId the atchFileId to set
	 **/
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	/**
	 * bbsId attribute?????.
	 * 
	 * @return the bbsId
	 **/
	public String getBbsId() {
		return bbsId;
	}

	/**
	 * bbsId attribute ???????.
	 * 
	 * @param bbsId the bbsId to set
	 **/
	public void setBbsId(String bbsId) {
		this.bbsId = bbsId;
	}

	/**
	 * frstRegisterId attribute?????.
	 * 
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * 
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * frstRegisterPnttm attribute?????.
	 * 
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute ???????.
	 * 
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * lastUpdusrId attribute?????.
	 * 
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * 
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * lastUpdusrPnttm attribute?????.
	 * 
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute ???????.
	 * 
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * ntceBgnde attribute?????.
	 * 
	 * @return the ntceBgnde
	 **/
	public String getNtceBgnde() {
		return ntceBgnde;
	}

	/**
	 * ntceBgnde attribute ???????.
	 * 
	 * @param ntceBgnde the ntceBgnde to set
	 **/
	public void setNtceBgnde(String ntceBgnde) {
		this.ntceBgnde = ntceBgnde;
	}

	/**
	 * ntceEndde attribute?????.
	 * 
	 * @return the ntceEndde
	 **/
	public String getNtceEndde() {
		return ntceEndde;
	}

	/**
	 * ntceEndde attribute ???????.
	 * 
	 * @param ntceEndde the ntceEndde to set
	 **/
	public void setNtceEndde(String ntceEndde) {
		this.ntceEndde = ntceEndde;
	}

	/**
	 * ntcrId attribute?????.
	 * 
	 * @return the ntcrId
	 **/
	public String getNtcrId() {
		return ntcrId;
	}

	/**
	 * ntcrId attribute ???????.
	 * 
	 * @param ntcrId the ntcrId to set
	 **/
	public void setNtcrId(String ntcrId) {
		this.ntcrId = ntcrId;
	}

	/**
	 * ntcrNm attribute?????.
	 * 
	 * @return the ntcrNm
	 **/
	public String getNtcrNm() {
		return ntcrNm;
	}

	/**
	 * ntcrNm attribute ???????.
	 * 
	 * @param ntcrNm the ntcrNm to set
	 **/
	public void setNtcrNm(String ntcrNm) {
		this.ntcrNm = ntcrNm;
	}

	/**
	 * nttCn attribute?????.
	 * 
	 * @return the nttCn
	 **/
	public String getNttCn() {
		return nttCn;
	}

	/**
	 * nttCn attribute ???????.
	 * 
	 * @param nttCn the nttCn to set
	 **/
	public void setNttCn(String nttCn) {
		this.nttCn = nttCn;
	}

	/**
	 * nttId attribute?????.
	 * 
	 * @return the nttId
	 **/
	public long getNttId() {
		return nttId;
	}

	/**
	 * nttId attribute ???????.
	 * 
	 * @param nttId the nttId to set
	 **/
	public void setNttId(long nttId) {
		this.nttId = nttId;
	}

	/**
	 * nttNo attribute?????.
	 * 
	 * @return the nttNo
	 **/
	public long getNttNo() {
		return nttNo;
	}

	/**
	 * nttNo attribute ???????.
	 * 
	 * @param nttNo the nttNo to set
	 **/
	public void setNttNo(long nttNo) {
		this.nttNo = nttNo;
	}

	/**
	 * nttSj attribute?????.
	 * 
	 * @return the nttSj
	 **/
	public String getNttSj() {
		return nttSj;
	}

	/**
	 * nttSj attribute ???????.
	 * 
	 * @param nttSj the nttSj to set
	 **/
	public void setNttSj(String nttSj) {
		this.nttSj = nttSj;
	}

	/**
	 * parnts attribute?????.
	 * 
	 * @return the parnts
	 **/
	public String getParnts() {
		return parnts;
	}

	/**
	 * parnts attribute ???????.
	 * 
	 * @param parnts the parnts to set
	 **/
	public void setParnts(String parnts) {
		this.parnts = parnts;
	}

	/**
	 * password attribute?????.
	 * 
	 * @return the password
	 **/
	public String getPassword() {
		return password;
	}

	/**
	 * password attribute ???????.
	 * 
	 * @param password the password to set
	 **/
	public void setPassword(String password) {
		this.password = password;
	}

	/**
	 * inqireCo attribute?????.
	 * 
	 * @return the inqireCo
	 **/
	public int getInqireCo() {
		return inqireCo;
	}

	/**
	 * inqireCo attribute ???????.
	 * 
	 * @param inqireCo the inqireCo to set
	 **/
	public void setInqireCo(int inqireCo) {
		this.inqireCo = inqireCo;
	}

	/**
	 * replyAt attribute?????.
	 * 
	 * @return the replyAt
	 **/
	public String getReplyAt() {
		return replyAt;
	}

	/**
	 * replyAt attribute ???????.
	 * 
	 * @param replyAt the replyAt to set
	 **/
	public void setReplyAt(String replyAt) {
		this.replyAt = replyAt;
	}

	/**
	 * replyLc attribute?????.
	 * 
	 * @return the replyLc
	 **/
	public String getReplyLc() {
		return replyLc;
	}

	/**
	 * replyLc attribute ???????.
	 * 
	 * @param replyLc the replyLc to set
	 **/
	public void setReplyLc(String replyLc) {
		this.replyLc = replyLc;
	}

	/**
	 * sortOrdr attribute?????.
	 * 
	 * @return the sortOrdr
	 **/
	public long getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute ???????.
	 * 
	 * @param sortOrdr the sortOrdr to set
	 **/
	public void setSortOrdr(long sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * useAt attribute?????.
	 * 
	 * @return the useAt
	 **/
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute ???????.
	 * 
	 * @param useAt the useAt to set
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * ntceEnddeView attribute?????.
	 * 
	 * @return the ntceEnddeView
	 **/
	public String getNtceEnddeView() {
		return ntceEnddeView;
	}

	/**
	 * ntceEnddeView attribute ???????.
	 * 
	 * @param ntceEnddeView the ntceEnddeView to set
	 **/
	public void setNtceEnddeView(String ntceEnddeView) {
		this.ntceEnddeView = ntceEnddeView;
	}

	/**
	 * ntceBgndeView attribute?????.
	 * 
	 * @return the ntceBgndeView
	 **/
	public String getNtceBgndeView() {
		return ntceBgndeView;
	}

	/**
	 * ntceBgndeView attribute ???????.
	 * 
	 * @param ntceBgndeView the ntceBgndeView to set
	 **/
	public void setNtceBgndeView(String ntceBgndeView) {
		this.ntceBgndeView = ntceBgndeView;
	}

	/**
	 * noticeAt attribute?????.
	 * 
	 * @return the noticeAt
	 **/
	public String getNoticeAt() {
		return noticeAt;
	}

	/**
	 * noticeAt attribute ???????.
	 * 
	 * @param noticeAt the noticeAt to set
	 **/
	public void setNoticeAt(String noticeAt) {
		this.noticeAt = noticeAt;
	}

	/**
	 * secretAt attribute?????.
	 * 
	 * @return the secretAt
	 **/
	public String getSecretAt() {
		return secretAt;
	}

	/**
	 * secretAt attribute ???????.
	 * 
	 * @param secretAt the secretAt to set
	 **/
	public void setSecretAt(String secretAt) {
		this.secretAt = secretAt;
	}

	/**
	 * sjBoldAt attribute?????.
	 * 
	 * @return the sjBoldAt
	 **/
	public String getSjBoldAt() {
		return sjBoldAt;
	}

	/**
	 * sjBoldAt attribute ???????.
	 * 
	 * @param sjBoldAt the sjBoldAt to set
	 **/
	public void setSjBoldAt(String sjBoldAt) {
		this.sjBoldAt = sjBoldAt;
	}

	public String getBlogAt() {
		return blogAt;
	}

	public void setBlogAt(String blogAt) {
		this.blogAt = blogAt;
	}

	public String getBlogId() {
		return blogId;
	}

	public void setBlogId(String blogId) {
		this.blogId = blogId;
	}

	/**
	 * toString ???? ????
	 **/
	public String toString() {
		return ToStringBuilder.reflectionToString(this);
	}
}
