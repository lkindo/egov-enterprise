package egovframework.com.uss.ion.nws.service;

/**
 *  
 * ?댁뒪?뺣낫瑜?泥섎━?섎뒗 VO ?대옒??
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
public class NewsVO extends NewsDefaultVO {
	
    private static final long serialVersionUID = 1L;
    
    /** ?댁뒪 ID */
    private String newsId;
    
    /** ?댁뒪?쒕ぉ */
    private String newsSj;
    
    /** ?댁뒪?댁슜 */
    private String newsCn;
    
    /** ?댁뒪異쒖쿂 */
    private String newsOrigin;
    
    /** 寃뚯떆?쇱옄 */
    private String ntceDe;

    /** 泥⑤??뚯씪ID */ 
    private String atchFileId;
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;

	/**
	 * newsId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNewsId() {
		return newsId;
	}

	/**
	 * newsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return newsId String
	 */
	public void setNewsId(String newsId) {
		this.newsId = newsId;
	}

	/**
	 * newsSj attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNewsSj() {
		return newsSj;
	}

	/**
	 * newsSj attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return newsSj String
	 */
	public void setNewsSj(String newsSj) {
		this.newsSj = newsSj;
	}

	/**
	 * newsCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNewsCn() {
		return newsCn;
	}

	/**
	 * newsCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return newsCn String
	 */
	public void setNewsCn(String newsCn) {
		this.newsCn = newsCn;
	}

	/**
	 * newsOrigin attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNewsOrigin() {
		return newsOrigin;
	}

	/**
	 * newsOrigin attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return newsOrigin String
	 */
	public void setNewsOrigin(String newsOrigin) {
		this.newsOrigin = newsOrigin;
	}

	/**
	 * ntceDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getNtceDe() {
		return ntceDe;
	}

	/**
	 * ntceDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return ntceDe String
	 */
	public void setNtceDe(String ntceDe) {
		this.ntceDe = ntceDe;
	}

	/**
	 * atchFileId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAtchFileId() {
		return atchFileId;
	}

	/**
	 * atchFileId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return atchFileId String
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
