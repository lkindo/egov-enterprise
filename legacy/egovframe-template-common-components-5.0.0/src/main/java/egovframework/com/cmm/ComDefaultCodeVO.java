package egovframework.com.cmm;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *  ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------       --------    ---------------------------
 *   2009.3.11   ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class ComDefaultCodeVO implements Serializable {
    /** 肄붾뱶 ID */
    private String codeId = "";
    
    /** ?곸꽭肄붾뱶 */
    private String code = "";
    
    /** 肄붾뱶紐?*/
    private String codeNm = "";
    
    /** 肄붾뱶?ㅻ챸 */
    private String codeDc = "";
    
    /** ?뱀젙?뚯씠釉붾챸 */
    private String tableNm = "";	//?뱀젙?뚯씠釉붿뿉??肄붾뱶?뺣낫瑜쇱텛異쒖떆 ?ъ슜
    
    /** ?곸꽭 議곌굔 ?щ? */
    private String haveDetailCondition = "N";
    
    /** ?곸꽭 議곌굔 */
    private String detailCondition = "";
    
    /**
     * codeId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the codeId
     */
    public String getCodeId() {
    	return codeId;
    }

    /**
     * codeId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param codeId
     *            the codeId to set
     */
    public void setCodeId(String codeId) {
    	this.codeId = codeId;
    }

    /**
     * code attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the code
     */
    public String getCode() {
    	return code;
    }

    /**
     * code attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param code
     *            the code to set
     */
    public void setCode(String code) {
    	this.code = code;
    }

    /**
     * codeNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the codeNm
     */
    public String getCodeNm() {
    	return codeNm;
    }

    /**
     * codeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param codeNm
     *            the codeNm to set
     */
    public void setCodeNm(String codeNm) {
    	this.codeNm = codeNm;
    }

    /**
     * codeDc attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the codeDc
     */
    public String getCodeDc() {
    	return codeDc;
    }

    /**
     * codeDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param codeDc
     *            the codeDc to set
     */
    public void setCodeDc(String codeDc) {
    	this.codeDc = codeDc;
    }

    /**
     * tableNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the tableNm
     */
    public String getTableNm() {
    	return tableNm;
    }

    /**
     * tableNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param tableNm
     *            the tableNm to set
     */
    public void setTableNm(String tableNm) {
    	this.tableNm = tableNm;
    }

    /**
     * haveDetailCondition attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the haveDetailCondition
     */
    public String getHaveDetailCondition() {
    	return haveDetailCondition;
    }

    /**
     * haveDetailCondition attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param haveDetailCondition
     *            the haveDetailCondition to set
     */
    public void setHaveDetailCondition(String haveDetailCondition) {
    	this.haveDetailCondition = haveDetailCondition;
    }

    /**
     * detailCondition attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the detailCondition
     */
    public String getDetailCondition() {
    	return detailCondition;
    }

    /**
     * detailCondition attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param detailCondition
     *            the detailCondition to set
     */
    public void setDetailCondition(String detailCondition) {
    	this.detailCondition = detailCondition;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
    	return ToStringBuilder.reflectionToString(this);
    }
}
