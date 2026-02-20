package egovframework.com.uss.ion.sit.service;

/**
 * 
 * ?ъ씠?몄젙蹂대? 泥섎━?섎뒗 VO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class SiteVO extends SiteDefaultVO {
	
    private static final long serialVersionUID = 1L;
    
    /** ?ъ씠??ID */
    private String siteId;
    
    /** ?ъ씠??URL */
    private String siteUrl;
    
    /** ?ъ씠?몃챸 */
    private String siteNm;
    
    /** ?ъ씠?몄꽕紐?*/
    private String siteDc;
    
    /** ?ъ씠?몄＜?쒕텇瑜섏퐫??*/
    private String siteThemaClCode;

    /** ?ъ씠?몄＜?쒕텇瑜섎챸 */
    private String siteThemaClNm;
    
    /** ?쒖꽦?щ? */
    private String actvtyAt;

    /** ?쒖꽦?щ?紐?*/
    private String actvtyAtNm;
    
    /** ?ъ슜?щ? */
    private String useAt;
    
    /** ?ъ슜?щ?紐?*/
    private String useAtNm;
    
    /** ?깅줉?먮챸 */
    private String emplyrNm;        

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;

	/**
	 * siteId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteId() {
		return siteId;
	}

	/**
	 * siteId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteId String
	 */
	public void setSiteId(String siteId) {
		this.siteId = siteId;
	}

	/**
	 * siteUrl attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteUrl() {
		return siteUrl;
	}

	/**
	 * siteUrl attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteUrl String
	 */
	public void setSiteUrl(String siteUrl) {
		this.siteUrl = siteUrl;
	}

	/**
	 * siteNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteNm() {
		return siteNm;
	}

	/**
	 * siteNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteNm String
	 */
	public void setSiteNm(String siteNm) {
		this.siteNm = siteNm;
	}

	/**
	 * siteDc attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteDc() {
		return siteDc;
	}

	/**
	 * siteDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteDc String
	 */
	public void setSiteDc(String siteDc) {
		this.siteDc = siteDc;
	}

	/**
	 * siteThemaClCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteThemaClCode() {
		return siteThemaClCode;
	}

	/**
	 * siteThemaClCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteThemaClCode String
	 */
	public void setSiteThemaClCode(String siteThemaClCode) {
		this.siteThemaClCode = siteThemaClCode;
	}

	/**
	 * siteThemaClNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSiteThemaClNm() {
		return siteThemaClNm;
	}

	/**
	 * siteThemaClNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return siteThemaClNm String
	 */
	public void setSiteThemaClNm(String siteThemaClNm) {
		this.siteThemaClNm = siteThemaClNm;
	}

	/**
	 * actvtyAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getActvtyAt() {
		return actvtyAt;
	}

	/**
	 * actvtyAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return actvtyAt String
	 */
	public void setActvtyAt(String actvtyAt) {
		this.actvtyAt = actvtyAt;
	}

	/**
	 * actvtyAtNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getActvtyAtNm() {
		return actvtyAtNm;
	}

	/**
	 * actvtyAtNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return actvtyAtNm String
	 */
	public void setActvtyAtNm(String actvtyAtNm) {
		this.actvtyAtNm = actvtyAtNm;
	}

	/**
	 * useAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return useAt String
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * useAtNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getUseAtNm() {
		return useAtNm;
	}

	/**
	 * useAtNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return useAtNm String
	 */
	public void setUseAtNm(String useAtNm) {
		this.useAtNm = useAtNm;
	}

	/**
	 * emplyrNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEmplyrNm() {
		return emplyrNm;
	}

	/**
	 * emplyrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return emplyrNm String
	 */
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}

	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

    
    
   
}
