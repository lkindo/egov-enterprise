package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name  : Board.java
 * @Description : 寃뚯떆臾쇱뿉 ????곗씠??泥섎━ 紐⑤뜽
 * @Modification Information
 * 
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.03.06       ?댁궪??                 理쒖큹 ?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 02. 13
 * @version 1.0
 * @see 
 * 
 */
@SuppressWarnings("serial")
public class Board implements Serializable {

	/**
	 * 寃뚯떆臾?泥⑤??뚯씪 ?꾩씠??
	 */
	private String atchFileId = "";
	/**
	 * 寃뚯떆???꾩씠??
	 */
	private String bbsId = "";
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId = "";
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId = "";
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm = "";
	/**
	 * 寃뚯떆?쒖옉??
	 */
	private String ntceBgnde = "";
	/**
	 * 寃뚯떆醫낅즺??
	 */
	private String ntceEndde = "";
	/**
	 * 寃뚯떆???꾩씠??
	 */
	private String ntcrId = "";
	/**
	 * 寃뚯떆?먮챸
	 */
	private String ntcrNm = "";
	/**
	 * 寃뚯떆臾??댁슜
	 */
	private String nttCn = "";
	/**
	 * 寃뚯떆臾??꾩씠??
	 */
	private long nttId = 0L;
	/**
	 * 寃뚯떆臾?踰덊샇
	 */
	private long nttNo = 0L;
	/**
	 * 寃뚯떆臾??쒕ぉ
	 */
	private String nttSj = "";
	/**
	 * 遺紐④?踰덊샇
	 */
	private String parnts = "0";
	/**
	 * ?⑥뒪?뚮뱶
	 */
	private String password = "";
	/**
	 * 議고쉶??
	 */
	private int inqireCo = 0;
	/**
	 * ?듭옣?щ?
	 */
	private String replyAt = "";
	/**
	 * ?듭옣?꾩튂
	 */
	private String replyLc = "0";
	/**
	 * ?뺣젹?쒖꽌
	 */
	private long sortOrdr = 0L;
	/**
	 * ?ъ슜?щ?
	 */
	private String useAt = "";
	/**
	 * 寃뚯떆 醫낅즺??
	 */
	private String ntceEnddeView = ""; 
	/**
	 * 寃뚯떆 ?쒖옉??
	 */
	private String ntceBgndeView = "";
	/**
	 * 怨듭??ы빆 ?щ? 
	 */
	private String noticeAt = "";
	/**
	 * 鍮꾨?湲 ?щ? 
	 */
	private String secretAt = "";
	/**
	 * ?쒕ぉ Bold ?щ? 
	 */
	private String sjBoldAt = "";
	/**
	 * 釉붾줈洹?寃뚯떆???щ? 
	 */
	private String blogAt = "";
	/** 釉붾줈洹?ID */
    private String blogId = "";
	/**
	 * atchFileId attribute瑜?由ы꽩?쒕떎.
	 * @return the atchFileId
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param atchFileId the atchFileId to set
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}

	/**
	 * bbsId attribute瑜?由ы꽩?쒕떎.
	 * @return the bbsId
	 */
	public String getBbsId() {
		return bbsId;
	}

	/**
	 * bbsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param bbsId the bbsId to set
	 */
	public void setBbsId(String bbsId) {
		this.bbsId = bbsId;
	}

	/**
	 * frstRegisterId attribute瑜?由ы꽩?쒕떎.
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * lastUpdusrId attribute瑜?由ы꽩?쒕떎.
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * lastUpdusrPnttm attribute瑜?由ы꽩?쒕떎.
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * ntceBgnde attribute瑜?由ы꽩?쒕떎.
	 * @return the ntceBgnde
	 */
	public String getNtceBgnde() {
		return ntceBgnde;
	}

	/**
	 * ntceBgnde attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntceBgnde the ntceBgnde to set
	 */
	public void setNtceBgnde(String ntceBgnde) {
		this.ntceBgnde = ntceBgnde;
	}

	/**
	 * ntceEndde attribute瑜?由ы꽩?쒕떎.
	 * @return the ntceEndde
	 */
	public String getNtceEndde() {
		return ntceEndde;
	}

	/**
	 * ntceEndde attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntceEndde the ntceEndde to set
	 */
	public void setNtceEndde(String ntceEndde) {
		this.ntceEndde = ntceEndde;
	}

	/**
	 * ntcrId attribute瑜?由ы꽩?쒕떎.
	 * @return the ntcrId
	 */
	public String getNtcrId() {
		return ntcrId;
	}

	/**
	 * ntcrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntcrId the ntcrId to set
	 */
	public void setNtcrId(String ntcrId) {
		this.ntcrId = ntcrId;
	}

	/**
	 * ntcrNm attribute瑜?由ы꽩?쒕떎.
	 * @return the ntcrNm
	 */
	public String getNtcrNm() {
		return ntcrNm;
	}

	/**
	 * ntcrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntcrNm the ntcrNm to set
	 */
	public void setNtcrNm(String ntcrNm) {
		this.ntcrNm = ntcrNm;
	}

	/**
	 * nttCn attribute瑜?由ы꽩?쒕떎.
	 * @return the nttCn
	 */
	public String getNttCn() {
		return nttCn;
	}

	/**
	 * nttCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param nttCn the nttCn to set
	 */
	public void setNttCn(String nttCn) {
		this.nttCn = nttCn;
	}

	/**
	 * nttId attribute瑜?由ы꽩?쒕떎.
	 * @return the nttId
	 */
	public long getNttId() {
		return nttId;
	}

	/**
	 * nttId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param nttId the nttId to set
	 */
	public void setNttId(long nttId) {
		this.nttId = nttId;
	}

	/**
	 * nttNo attribute瑜?由ы꽩?쒕떎.
	 * @return the nttNo
	 */
	public long getNttNo() {
		return nttNo;
	}

	/**
	 * nttNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param nttNo the nttNo to set
	 */
	public void setNttNo(long nttNo) {
		this.nttNo = nttNo;
	}

	/**
	 * nttSj attribute瑜?由ы꽩?쒕떎.
	 * @return the nttSj
	 */
	public String getNttSj() {
		return nttSj;
	}

	/**
	 * nttSj attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param nttSj the nttSj to set
	 */
	public void setNttSj(String nttSj) {
		this.nttSj = nttSj;
	}

	/**
	 * parnts attribute瑜?由ы꽩?쒕떎.
	 * @return the parnts
	 */
	public String getParnts() {
		return parnts;
	}

	/**
	 * parnts attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param parnts the parnts to set
	 */
	public void setParnts(String parnts) {
		this.parnts = parnts;
	}

	/**
	 * password attribute瑜?由ы꽩?쒕떎.
	 * @return the password
	 */
	public String getPassword() {
		return password;
	}

	/**
	 * password attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param password the password to set
	 */
	public void setPassword(String password) {
		this.password = password;
	}

	/**
	 * inqireCo attribute瑜?由ы꽩?쒕떎.
	 * @return the inqireCo
	 */
	public int getInqireCo() {
		return inqireCo;
	}

	/**
	 * inqireCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param inqireCo the inqireCo to set
	 */
	public void setInqireCo(int inqireCo) {
		this.inqireCo = inqireCo;
	}

	/**
	 * replyAt attribute瑜?由ы꽩?쒕떎.
	 * @return the replyAt
	 */
	public String getReplyAt() {
		return replyAt;
	}

	/**
	 * replyAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param replyAt the replyAt to set
	 */
	public void setReplyAt(String replyAt) {
		this.replyAt = replyAt;
	}

	/**
	 * replyLc attribute瑜?由ы꽩?쒕떎.
	 * @return the replyLc
	 */
	public String getReplyLc() {
		return replyLc;
	}

	/**
	 * replyLc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param replyLc the replyLc to set
	 */
	public void setReplyLc(String replyLc) {
		this.replyLc = replyLc;
	}

	/**
	 * sortOrdr attribute瑜?由ы꽩?쒕떎.
	 * @return the sortOrdr
	 */
	public long getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sortOrdr the sortOrdr to set
	 */
	public void setSortOrdr(long sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * useAt attribute瑜?由ы꽩?쒕떎.
	 * @return the useAt
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useAt the useAt to set
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * ntceEnddeView attribute瑜?由ы꽩?쒕떎.
	 * @return the ntceEnddeView
	 */
	public String getNtceEnddeView() {
		return ntceEnddeView;
	}

	/**
	 * ntceEnddeView attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntceEnddeView the ntceEnddeView to set
	 */
	public void setNtceEnddeView(String ntceEnddeView) {
		this.ntceEnddeView = ntceEnddeView;
	}

	/**
	 * ntceBgndeView attribute瑜?由ы꽩?쒕떎.
	 * @return the ntceBgndeView
	 */
	public String getNtceBgndeView() {
		return ntceBgndeView;
	}

	/**
	 * ntceBgndeView attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ntceBgndeView the ntceBgndeView to set
	 */
	public void setNtceBgndeView(String ntceBgndeView) {
		this.ntceBgndeView = ntceBgndeView;
	}
	
	/**
	 * noticeAt attribute瑜?由ы꽩?쒕떎.
	 * @return the noticeAt
	 */
	public String getNoticeAt() {
		return noticeAt;
	}

	/**
	 * noticeAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param noticeAt the noticeAt to set
	 */
	public void setNoticeAt(String noticeAt) {
		this.noticeAt = noticeAt;
	}
	
	/**
	 * secretAt attribute瑜?由ы꽩?쒕떎.
	 * @return the secretAt
	 */
	public String getSecretAt() {
		return secretAt;
	}

	/**
	 * secretAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param secretAt the secretAt to set
	 */
	public void setSecretAt(String secretAt) {
		this.secretAt = secretAt;
	}
	
	/**
	 * sjBoldAt attribute瑜?由ы꽩?쒕떎.
	 * @return the sjBoldAt
	 */
	public String getSjBoldAt() {
		return sjBoldAt;
	}

	/**
	 * sjBoldAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sjBoldAt the sjBoldAt to set
	 */
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
	 * toString 硫붿냼?쒕? ?移섑븳??
	 */
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}
}
