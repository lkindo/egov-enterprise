package egovframework.com.uss.ion.rec.service;


/**
 * 
 * 異붿쿇?ъ씠?몄젙蹂대? 泥섎━?섎뒗 VO ?대옒??
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
public class RecomendSiteVO extends RecomendSiteDefaultVO {
	
    private static final long serialVersionUID = 1L;
    
    /** 異붿쿇?ъ씠??ID */
    private String recomendSiteId;
    
    /** 異붿쿇?ъ씠??URL */
    private String recomendSiteUrl;
    
    /** 異붿쿇?ъ씠?몃챸 */
    private String recomendSiteNm;
    
    /** 異붿쿇?ъ씠?몄꽕紐?*/
    private String recomendSiteDc;
    
    /** 異붿쿇?ъ쑀?댁슜 */
    private String recomendResnCn;

    /** 異붿쿇?뱀씤?щ? */
    private String recomendConfmAt;
    
    /** ?뱀씤?쇱옄 */
    private String confmDe;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;

	/**
	 * recomendSiteId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendSiteId() {
		return recomendSiteId;
	}

	/**
	 * recomendSiteId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendSiteId String
	 */
	public void setRecomendSiteId(String recomendSiteId) {
		this.recomendSiteId = recomendSiteId;
	}

	/**
	 * recomendSiteUrl attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendSiteUrl() {
		return recomendSiteUrl;
	}

	/**
	 * recomendSiteUrl attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendSiteUrl String
	 */
	public void setRecomendSiteUrl(String recomendSiteUrl) {
		this.recomendSiteUrl = recomendSiteUrl;
	}

	/**
	 * recomendSiteNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendSiteNm() {
		return recomendSiteNm;
	}

	/**
	 * recomendSiteNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendSiteNm String
	 */
	public void setRecomendSiteNm(String recomendSiteNm) {
		this.recomendSiteNm = recomendSiteNm;
	}

	/**
	 * recomendSiteDc attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendSiteDc() {
		return recomendSiteDc;
	}

	/**
	 * recomendSiteDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendSiteDc String
	 */
	public void setRecomendSiteDc(String recomendSiteDc) {
		this.recomendSiteDc = recomendSiteDc;
	}

	/**
	 * recomendResnCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendResnCn() {
		return recomendResnCn;
	}

	/**
	 * recomendResnCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendResnCn String
	 */
	public void setRecomendResnCn(String recomendResnCn) {
		this.recomendResnCn = recomendResnCn;
	}

	/**
	 * recomendConfmAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRecomendConfmAt() {
		return recomendConfmAt;
	}

	/**
	 * recomendConfmAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recomendConfmAt String
	 */
	public void setRecomendConfmAt(String recomendConfmAt) {
		this.recomendConfmAt = recomendConfmAt;
	}

	/**
	 * confmDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getConfmDe() {
		return confmDe;
	}

	/**
	 * confmDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return confmDe String
	 */
	public void setConfmDe(String confmDe) {
		this.confmDe = confmDe;
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
