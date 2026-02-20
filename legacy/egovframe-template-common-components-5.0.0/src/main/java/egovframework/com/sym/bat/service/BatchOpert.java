package egovframework.com.sym.bat.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛곗튂?묒뾽愿由ъ뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class BatchOpert extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -8854151716958649397L;
	/**
	 * 諛곗튂?묒뾽ID
	 */
	private String batchOpertId;
	/**
	 * 諛곗튂?묒뾽紐?
	 */
	private String batchOpertNm;
	/**
	 * 諛곗튂?꾨줈洹몃옩
	 */
	private String batchProgrm;
	/**
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙??
	 */
	private String lastUpdusrPnttm;
	/**
	 * ?뚮씪誘명꽣
	 */
	private String paramtr;
	/**
	 * ?ъ슜?щ?
	 */
	private String useAt;
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;

	/**
	 * 諛곗튂?묒뾽ID瑜?由ы꽩?쒕떎.
	 * @return the batchOpertId
	 */
	public String getBatchOpertId() {
		return batchOpertId;
	}

	/**
	 * 諛곗튂?묒뾽ID瑜??ㅼ젙?쒕떎.
	 * @param batchOpertId 	?ㅼ젙??諛곗튂?묒뾽ID
	 */
	public void setBatchOpertId(String batchOpertId) {
		this.batchOpertId = batchOpertId;
	}

	/**
	 * 諛곗튂?묒뾽紐낆쓣 由ы꽩?쒕떎.
	 * @return the batchOpertNm
	 */
	public String getBatchOpertNm() {
		return batchOpertNm;
	}

	/**
	 * 諛곗튂?묒뾽紐낆쓣 ?ㅼ젙?쒕떎.
	 * @param batchOpertNm ?ㅼ젙??諛곗튂?묒뾽紐?
	 */
	public void setBatchOpertNm(String batchOpertNm) {
		this.batchOpertNm = batchOpertNm;
	}

	/**
	 * 諛곗튂?꾨줈洹몃옩??由ы꽩?쒕떎.
	 * @return the batchProgrm
	 */
	public String getBatchProgrm() {
		return batchProgrm;
	}

	/**
	 * 諛곗튂?꾨줈洹몃옩???ㅼ젙?쒕떎.
	 * @param batchProgrm ?ㅼ젙??諛곗튂?꾨줈洹몃옩
	 */
	public void setBatchProgrm(String batchProgrm) {
		this.batchProgrm = batchProgrm;
	}

	/**
	 * 理쒖쥌?섏젙?륤D瑜?由ы꽩?쒕떎.
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * 理쒖쥌?섏젙?륤D瑜??ㅼ젙?쒕떎.
	 * @param lastUpdusrId ?ㅼ젙??理쒖쥌?섏젙?륤D
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * 理쒖쥌?섏젙?쒖젏??由ы꽩?쒕떎.
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * 理쒖쥌?섏젙?쒖젏???ㅼ젙?쒕떎.
	 * @param lastUpdusrPnttm ?ㅼ젙??理쒖쥌?섏젙?쒖젏
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * ?뚮씪誘명꽣瑜?由ы꽩?쒕떎.
	 * @return the paramtr
	 */
	public String getParamtr() {
		return paramtr;
	}

	/**
	 * ?뚮씪誘명꽣瑜??ㅼ젙?쒕떎.
	 * @param paramtr ?ㅼ젙???뚮씪誘명꽣
	 */
	public void setParamtr(String paramtr) {
		this.paramtr = paramtr;
	}

	/**
	 * ?ъ슜?щ?瑜?由ы꽩?쒕떎.
	 * @return the useAt
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * ?ъ슜?щ?瑜??ㅼ젙?쒕떎.
	 * @param useAt ?ㅼ젙???ъ슜?щ?
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

}