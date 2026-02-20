package egovframework.com.cop.sms.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 臾몄옄硫붿떆吏 ?쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.19
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.19  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class SmsConnection implements Serializable {
    /** ?섏떊踰덊샇 */
    private String callTo = "";
    
    /** 諛쒖떊踰덊샇 */
    private String callFrom = "";
    
    /** 肄쒕갚踰덊샇 */
    private String callBack = "";
    
    /** 臾댁꽑?명꽣??二쇱냼 */
    private String callBackUrl = "";
    
    /** Message */
    private String text = "";
    
    /** serial 踰덊샇 : must be unique in single SME */
    private String messageId = "";
    
    /** 寃곌낵肄붾뱶 */
    private int result = 0;
    
    /** 寃곌낵硫붿떆吏 */
    private String resultMessage = "";

    /**
     * callTo attribute瑜?由ы꽩?쒕떎.
     * @return the callTo
     */
    public String getCallTo() {
        return callTo;
    }

    /**
     * callTo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param callTo the callTo to set
     */
    public void setCallTo(String callTo) {
        this.callTo = callTo;
    }

    /**
     * callFrom attribute瑜?由ы꽩?쒕떎.
     * @return the callFrom
     */
    public String getCallFrom() {
        return callFrom;
    }

    /**
     * callFrom attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param callFrom the callFrom to set
     */
    public void setCallFrom(String callFrom) {
        this.callFrom = callFrom;
    }

    /**
     * callBack attribute瑜?由ы꽩?쒕떎.
     * @return the callBack
     */
    public String getCallBack() {
        return callBack;
    }

    /**
     * callBack attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param callBack the callBack to set
     */
    public void setCallBack(String callBack) {
        this.callBack = callBack;
    }

    /**
     * callBackUrl attribute瑜?由ы꽩?쒕떎.
     * @return the callBackUrl
     */
    public String getCallBackUrl() {
        return callBackUrl;
    }

    /**
     * callBackUrl attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param callBackUrl the callBackUrl to set
     */
    public void setCallBackUrl(String callBackUrl) {
        this.callBackUrl = callBackUrl;
    }

    /**
     * text attribute瑜?由ы꽩?쒕떎.
     * @return the text
     */
    public String getText() {
        return text;
    }

    /**
     * text attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param text the text to set
     */
    public void setText(String text) {
        this.text = text;
    }

    /**
     * messageId attribute瑜?由ы꽩?쒕떎.
     * @return the messageId
     */
    public String getMessageId() {
        return messageId;
    }

    /**
     * messageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param messageId the messageId to set
     */
    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    /**
     * result attribute瑜?由ы꽩?쒕떎.
     * @return the result
     */
    public int getResult() {
        return result;
    }

    /**
     * result attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param result the result to set
     */
    public void setResult(int result) {
        this.result = result;
    }

    /**
     * resultMessage attribute瑜?由ы꽩?쒕떎.
     * @return the resultMessage
     */
    public String getResultMessage() {
        return resultMessage;
    }

    /**
     * resultMessage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param resultMessage the resultMessage to set
     */
    public void setResultMessage(String resultMessage) {
        this.resultMessage = resultMessage;
    }
    
    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
