package egovframework.com.cop.sms.service;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 臾몄옄硫붿떆吏 ?쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *	 2011.10.07	 ?닿린??	蹂댁븞痍⑥빟???섏젙(private 諛곗뿴 泥섎━)
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Sms implements Serializable {
    /** 臾몄옄硫붿떆吏 ID */
    private String smsId = "";

    /** ?꾩넚 ?꾪솕踰덊샇 */
    private String trnsmitTelno = "";

    /** ?꾩넚 ?댁슜 */
    private String trnsmitCn = "";

    /** ?섏떊 ?꾪솕踰덊샇 媛쒖닔 */
    private int recptnCnt = 0;

    /** ?좎씪 ?꾩씠??*/
    private String uniqId = "";

    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";

    /** 理쒖큹 ?깅줉?먮챸 */
    private String frstRegisterNm = "";

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";

    /** ?섏떊 ?뺣낫 List */
    private List<SmsRecptn> recptn = null;

    /** ?섏쟾 ?꾪솕踰덊샇 諛곗뿴 */
    private String[] recptnTelno = null;

    /**
     * smsId attribute瑜?由ы꽩?쒕떎.
     * @return the smsId
     */
    public String getSmsId() {
        return smsId;
    }

    /**
     * smsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param smsId the smsId to set
     */
    public void setSmsId(String smsId) {
        this.smsId = smsId;
    }

    /**
     * trnsmitTelno attribute瑜?由ы꽩?쒕떎.
     * @return the trnsmitTelno
     */
    public String getTrnsmitTelno() {
        return trnsmitTelno;
    }

    /**
     * trnsmitTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param trnsmitTelno the trnsmitTelno to set
     */
    public void setTrnsmitTelno(String trnsmitTelno) {
        this.trnsmitTelno = trnsmitTelno;
    }

    /**
     * trnsmitCn attribute瑜?由ы꽩?쒕떎.
     * @return the trnsmitCn
     */
    public String getTrnsmitCn() {
        return trnsmitCn;
    }

    /**
     * trnsmitCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param trnsmitCn the trnsmitCn to set
     */
    public void setTrnsmitCn(String trnsmitCn) {
        this.trnsmitCn = trnsmitCn;
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
     * frstRegisterNm attribute瑜?由ы꽩?쒕떎.
     * @return the frstRegisterNm
     */
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param frstRegisterNm the frstRegisterNm to set
     */
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
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
     * recptn attribute瑜?由ы꽩?쒕떎.
     * @return the recptn
     */
    public List<SmsRecptn> getRecptn() {
        return recptn;
    }

    /**
     * recptn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param recptn the recptn to set
     */
    public void setRecptn(List<SmsRecptn> recptn) {
        this.recptn = Collections.unmodifiableList(recptn);
    }

    /**
     * uniqId attribute瑜?由ы꽩?쒕떎.
     * @return the uniqId
     */
    public String getUniqId() {
        return uniqId;
    }

    /**
     * uniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param uniqId the uniqId to set
     */
    public void setUniqId(String uniqId) {
        this.uniqId = uniqId;
    }

    /**
     * recptnCnt attribute瑜?由ы꽩?쒕떎.
     * @return the recptnCnt
     */
    public int getRecptnCnt() {
        return recptnCnt;
    }

    /**
     * recptnCnt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param recptnCnt the recptnCnt to set
     */
    public void setRecptnCnt(int recptnCnt) {
        this.recptnCnt = recptnCnt;
    }

    /**
     * recptnTelno attribute瑜?由ы꽩?쒕떎.
     * @return the recptnTelno
     */
//    public String[] getRecptnTelno() {
//        return recptnTelno;
//    }
    // 2011.10.07 private 諛곗뿴??public ?⑥닔媛 諛섑솚?섏? ?딅룄濡???
    public String[] getRecptnTelno() {
    	// 硫붿냼?쒕? private?쇰줈 ?섍굅?? 蹂듭젣蹂몄쓣 諛섑솚?섍굅??
    	// ?섏젙???쒖뼱?섎뒗 public硫붿냼?쒕? 蹂꾨룄濡?留뚮뱺??
    	String[] ret = null;
    	if(this.recptnTelno != null) {
    		ret = new String[recptnTelno.length];
    		for (int i=0; i<recptnTelno.length; i++) {
    			ret[i] = this.recptnTelno[i];
    		}
    	}
    	return ret;
    }

    /**
     * recptnTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param recptnTelno the recptnTelno to set
     */
//    public void setRecptnTelno(String[] recptnTelno) {
//        this.recptnTelno = recptnTelno;
//    }
    // 2011.10.07 private 諛곗뿴-?좏삎 ?꾨뱶??怨듭슜 ?곗씠???좊떦?섏? ?딅룄濡???
	public void setRecptnTelno(String[] recptnTelno) {
		this.recptnTelno = new String[recptnTelno.length];
		for (int i = 0; i < recptnTelno.length; ++i) {
			this.recptnTelno[i] = recptnTelno[i];
		}
	}

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
