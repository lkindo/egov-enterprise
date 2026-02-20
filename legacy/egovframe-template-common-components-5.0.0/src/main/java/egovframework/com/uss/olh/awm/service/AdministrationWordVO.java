package egovframework.com.uss.olh.awm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?됱젙?꾨Ц?⑹뼱?ъ쟾愿由?VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
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
public class AdministrationWordVO extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -5313141971613650852L;

	/** ?됱젙?⑹뼱?ъ쟾 ?꾩씠??*/
    private String administWordId;

    /** ?됱젙?⑹뼱?ъ쟾 紐?*/
    private String administWordNm;

    /** ?됱젙?⑹뼱?ъ쟾 ?곷Ц紐?*/
    private String administWordEngNm;

    /** ?됱젙?⑹뼱?ъ쟾 ?쎌뼱  */
    private String administWordAbrv;

    /** 二쇱젣?곸뿭  */
    private String themaRelm;

    /** ?⑹뼱援щ텇  */
    private String wordDomn;
    
    /** ?⑹뼱援щ텇紐? */
    private String wordDomnNm;

    /** 愿?⑦몴以?⑹뼱  */
    private String stdWord;

    /** ?됱젙?⑹뼱?ъ쟾 ?뺤쓽 */
    private String administWordDf;

    /** ?됱젙?⑹뼱?ъ쟾 ?ㅻ챸 */
    private String administWordDc;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

    /** 珥덉꽦寃??*/
    private String choseongA;

    /** 珥덉꽦寃??*/
    private String choseongB;

    /** 而⑦듃濡?紐낅졊??*/
    private String cmd;


    /**
     * administWordId 由ы꽩
     *
     * @return the administWordId
     */
    public String getAdministWordId() {
        return administWordId;
    }

    /**
     * administWordId ?ㅼ젙
     *
     * @param administWordId the administWordId to set
     */
    public void setAdministWordId(String administWordId) {
        this.administWordId = administWordId;
    }

    /**
     * administWordNm 由ы꽩
     *
     * @return the administWordNm
     */
    public String getAdministWordNm() {
        return administWordNm;
    }

    /**
     * administWordNm ?ㅼ젙
     *
     * @param administWordNm the administWordNm to set
     */
    public void setAdministWordNm(String administWordNm) {
        this.administWordNm = administWordNm;
    }

    /**
     * administWordEngNm 由ы꽩
     *
     * @return the administWordEngNm
     */
    public String getAdministWordEngNm() {
        return administWordEngNm;
    }

    /**
     * administWordEngNm ?ㅼ젙
     *
     * @param administWordEngNm the administWordEngNm to set
     */
    public void setAdministWordEngNm(String administWordEngNm) {
        this.administWordEngNm = administWordEngNm;
    }

    /**
     * administWordAbrv 由ы꽩
     *
     * @return the administWordAbrv
     */
    public String getAdministWordAbrv() {
        return administWordAbrv;
    }

    /**
     * administWordAbrv ?ㅼ젙
     *
     * @param administWordAbrv the administWordAbrv to set
     */
    public void setAdministWordAbrv(String administWordAbrv) {
        this.administWordAbrv = administWordAbrv;
    }

    /**
     * themaRelm 由ы꽩
     *
     * @return the themaRelm
     */
    public String getThemaRelm() {
        return themaRelm;
    }

    /**
     * themaRelm ?ㅼ젙
     *
     * @param themaRelm the themaRelm to set
     */
    public void setThemaRelm(String themaRelm) {
        this.themaRelm = themaRelm;
    }

    /**
     * wordDomn 由ы꽩
     *
     * @return the wordDomn
     */
    public String getWordDomn() {
        return wordDomn;
    }

    /**
     * wordDomn ?ㅼ젙
     *
     * @param wordDomn the wordDomn to set
     */
    public void setWordDomn(String wordDomn) {
        this.wordDomn = wordDomn;
    }

    /**
     * wordDomnNm 由ы꽩
     *
     * @return the wordDomn
     */
    public String getWordDomnNm() {
    	return wordDomnNm;
    }
    
    /**
     * wordDomnNm ?ㅼ젙
     *
     * @param wordDomnNm the wordDomnNm to set
     */
    public void setWordDomnNm(String wordDomnNm) {
    	this.wordDomnNm = wordDomnNm;
    }
    
    /**
     * stdWord 由ы꽩
     *
     * @return the stdWord
     */
    public String getStdWord() {
        return stdWord;
    }

    /**
     * stdWord ?ㅼ젙
     *
     * @param stdWord the stdWord to set
     */
    public void setStdWord(String stdWord) {
        this.stdWord = stdWord;
    }

    /**
     * administWordDf 由ы꽩
     *
     * @return the administWordDf
     */
    public String getAdministWordDf() {
        return administWordDf;
    }

    /**
     * administWordDf ?ㅼ젙
     *
     * @param administWordDf the administWordDf to set
     */
    public void setAdministWordDf(String administWordDf) {
        this.administWordDf = administWordDf;
    }

    /**
     * administWordDc 由ы꽩
     *
     * @return the administWordDc
     */
    public String getAdministWordDc() {
        return administWordDc;
    }

    /**
     * administWordDc ?ㅼ젙
     *
     * @param administWordDc the administWordDc to set
     */
    public void setAdministWordDc(String administWordDc) {
        this.administWordDc = administWordDc;
    }

    /**
     * frstRegisterPnttm 由ы꽩
     *
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm ?ㅼ젙
     *
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId 由ы꽩
     *
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId ?ㅼ젙
     *
     * @param frstRegisterId the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * lastUpdusrPnttm 由ы꽩
     *
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm ?ㅼ젙
     *
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * lastUpdusrId 由ы꽩
     *
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId ?ㅼ젙
     *
     * @param lastUpdusrId the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * choseongA 由ы꽩
     *
     * @return the choseongA
     */
    public String getChoseongA() {
        return choseongA;
    }

    /**
     * choseongA ?ㅼ젙
     *
     * @param choseongA the choseongA to set
     */
    public void setChoseongA(String choseongA) {
        this.choseongA = choseongA;
    }

    /**
     * choseongB 由ы꽩
     *
     * @return the choseongB
     */
    public String getChoseongB() {
        return choseongB;
    }

    /**
     * choseongB ?ㅼ젙
     *
     * @param choseongB the choseongB to set
     */
    public void setChoseongB(String choseongB) {
        this.choseongB = choseongB;
    }

    /**
     * cmd 由ы꽩
     *
     * @return the cmd
     */
    public String getCmd() {
        return cmd;
    }

    /**
     * cmd ?ㅼ젙
     *
     * @param cmd the cmd to set
     */
    public void setCmd(String cmd) {
        this.cmd = cmd;
    }

    /**
	 * toString 硫붿냼?쒕? ?移섑븳??
	 */
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

}