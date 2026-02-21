package egovframework.com.cop.sms.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?? ???????????
 * 
 * @author ?????? ????
 * @since 2009.06.19
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.19  ????         ????
 *
 *      </pre>
 **/
public class SmsConnection implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ????**/
    private String callTo = "";

    /** ?? **/
    private String callFrom = "";

    /** ?? **/
    private String callBack = "";

    /** ??????**/
    private String callBackUrl = "";

    /** Message **/
    private String text = "";

    /** serial ??: must be unique in single SME **/
    private String messageId = "";

    /** ? **/
    private int result = 0;

    /** ? **/
    private String resultMessage = "";

    /**
     * callTo attribute?????.
     * 
     * @return the callTo
     **/
    public String getCallTo() {
        return callTo;
    }

    /**
     * callTo attribute ???????.
     * 
     * @param callTo the callTo to set
     **/
    public void setCallTo(String callTo) {
        this.callTo = callTo;
    }

    /**
     * callFrom attribute?????.
     * 
     * @return the callFrom
     **/
    public String getCallFrom() {
        return callFrom;
    }

    /**
     * callFrom attribute ???????.
     * 
     * @param callFrom the callFrom to set
     **/
    public void setCallFrom(String callFrom) {
        this.callFrom = callFrom;
    }

    /**
     * callBack attribute?????.
     * 
     * @return the callBack
     **/
    public String getCallBack() {
        return callBack;
    }

    /**
     * callBack attribute ???????.
     * 
     * @param callBack the callBack to set
     **/
    public void setCallBack(String callBack) {
        this.callBack = callBack;
    }

    /**
     * callBackUrl attribute?????.
     * 
     * @return the callBackUrl
     **/
    public String getCallBackUrl() {
        return callBackUrl;
    }

    /**
     * callBackUrl attribute ???????.
     * 
     * @param callBackUrl the callBackUrl to set
     **/
    public void setCallBackUrl(String callBackUrl) {
        this.callBackUrl = callBackUrl;
    }

    /**
     * text attribute?????.
     * 
     * @return the text
     **/
    public String getText() {
        return text;
    }

    /**
     * text attribute ???????.
     * 
     * @param text the text to set
     **/
    public void setText(String text) {
        this.text = text;
    }

    /**
     * messageId attribute?????.
     * 
     * @return the messageId
     **/
    public String getMessageId() {
        return messageId;
    }

    /**
     * messageId attribute ???????.
     * 
     * @param messageId the messageId to set
     **/
    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    /**
     * result attribute?????.
     * 
     * @return the result
     **/
    public int getResult() {
        return result;
    }

    /**
     * result attribute ???????.
     * 
     * @param result the result to set
     **/
    public void setResult(int result) {
        this.result = result;
    }

    /**
     * resultMessage attribute?????.
     * 
     * @return the resultMessage
     **/
    public String getResultMessage() {
        return resultMessage;
    }

    /**
     * resultMessage attribute ???????.
     * 
     * @param resultMessage the resultMessage to set
     **/
    public void setResultMessage(String resultMessage) {
        this.resultMessage = resultMessage;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
