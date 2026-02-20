package egovframework.com.uss.ion.tir.service;

import java.io.Serializable;
import java.util.Date;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?몄쐞?곗닔??Model and VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 * 
 * </pre>
 */
@SuppressWarnings("serial")
public class TwitterInfo extends ComDefaultVO implements Serializable{
 
	/** ?몄쐞???꾩씠??*/
	private Long twitterId;
	
	/** ?몄쐞??鍮꾨?踰덊샇 */
	private String twitterPw;
	
	/** ?몄쐞???대쫫 */
	private String twitterNmae;
	
	/** ?몄쐞???ㅽ겕由곕챸 */
	private String twitterScreenName;
	
	/** ?몄쐞??URL */
	private String twitterURL;
	
	/** ?몄쐞???띿뒪??*/
	private String twitterText;
	
	/** ?몄쐞???깅줉??*/
	private Date twitterCreatedAt;
	
	/** ?몄쐞???꾨줈?뚯씪 ?대?吏紐?*/
	private String twitterProfileImageURL;
	
	/** ?몄쐞???뚯뒪 */
	 private String twitterSource;
	 
	 /** ?깅줉???몄쐵 ?꾩씠??/
	 /* 2023 08 23 異붽?*/
	 private Long twitterTweetId;

	public Long getTwitterTweetId() {
		return twitterTweetId;
	}

	public void setTwitterTweetId(Long twitterTweetId) {
		this.twitterTweetId = twitterTweetId;
	}

	/**
	 * @return the twitterId
	 */
	public Long getTwitterId() {
		return twitterId;
	}

	/**
	 * @param twitterId the twitterId to set
	 */
	public void setTwitterId(Long twitterId) {
		this.twitterId = twitterId;
	}

	/**
	 * @return the twitterPw
	 */
	public String getTwitterPw() {
		return twitterPw;
	}

	/**
	 * @param twitterPw the twitterPw to set
	 */
	public void setTwitterPw(String twitterPw) {
		this.twitterPw = twitterPw;
	}

	/**
	 * @return the twitterNmae
	 */
	public String getTwitterNmae() {
		return twitterNmae;
	}

	/**
	 * @param twitterNmae the twitterNmae to set
	 */
	public void setTwitterNmae(String twitterNmae) {
		this.twitterNmae = twitterNmae;
	}

	/**
	 * @return the twitterScreenName
	 */
	public String getTwitterScreenName() {
		return twitterScreenName;
	}

	/**
	 * @param twitterScreenName the twitterScreenName to set
	 */
	public void setTwitterScreenName(String twitterScreenName) {
		this.twitterScreenName = twitterScreenName;
	}

	/**
	 * @return the twitterURL
	 */
	public String getTwitterURL() {
		return twitterURL;
	}

	/**
	 * @param twitterURL the twitterURL to set
	 */
	public void setTwitterURL(String twitterURL) {
		this.twitterURL = twitterURL;
	}

	/**
	 * @return the twitterText
	 */
	public String getTwitterText() {
		return twitterText;
	}

	/**
	 * @param twitterText the twitterText to set
	 */
	public void setTwitterText(String twitterText) {
		this.twitterText = twitterText;
	}

	/**
	 * @return the twitterCreatedAt
	 */
	public Date getTwitterCreatedAt() {
		return twitterCreatedAt;
	}

	/**
	 * @param date the twitterCreatedAt to set
	 */
	public void setTwitterCreatedAt(Date date) {
		this.twitterCreatedAt = date;
	}

	/**
	 * @return the twitterProfileImageURL
	 */
	public String getTwitterProfileImageURL() {
		return twitterProfileImageURL;
	}

	/**
	 * @param twitterProfileImageURL the twitterProfileImageURL to set
	 */
	public void setTwitterProfileImageURL(String twitterProfileImageURL) {
		this.twitterProfileImageURL = twitterProfileImageURL;
	}

	/**
	 * @return the twitterSource
	 */
	public String getTwitterSource() {
		return twitterSource;
	}

	/**
	 * @param twitterSource the twitterSource to set
	 */
	public void setTwitterSource(String twitterSource) {
		this.twitterSource = twitterSource;
	}
	 

	 
}
