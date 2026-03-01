package egovframework.com.uss.ion.rmm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?쎈룄愿由ъ뿉 ???VO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쎈룄?뺣낫 議고쉶瑜??꾪빐 ?꾩슂???뺣낫瑜?愿由ы븳??
 *  
 * @author ?μ갔??
 * @since 2014.08.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??		?섏젙??	?섏젙?댁슜
 *  -----------		------		---------
 *   2014.08.27		?μ갔??	理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class RoughMapDefaultVO implements Serializable {

	private static final long serialVersionUID = 1L;

	/** 泥ロ럹?댁? ?몃뜳??*/
    private int firstIndex = 1;
    
    /** * 留덉?留됲럹?댁? ?몃뜳??*/
    private int lastIndex = 1;
    
    /** ?꾩옱?섏씠吏 */
    private int pageIndex = 1;
    
    /** ?섏씠吏 ?ъ씠利?*/
    private int pageSize = 10;
    
    /** ?섏씠吏 媛쒖닔 */
    private int pageUnit = 10;
    
    /** ?섏씠吏???덉퐫??媛쒖닔 */
    private int recordCountPerPage = 10;
    
    /** 寃?됱“嫄?*/
    private String searchCondition = "";
    
    /** 寃?됰떒??*/
    private String searchKeyword = "";
    
    /** 寃?됱궗?⑹뿬遺 */
    private String searchUseYn = "";

    /**
     * 泥ロ럹?댁? ?몃뜳?ㅻ? 媛?몄삩??
     * @return int 泥ロ럹?댁? ?몃뜳??
     */
    public int getFirstIndex(){
        return firstIndex;
    }

    /**
     * 泥ロ럹?댁? ?몃뜳?ㅻ? ??ν븳??
     * @param firstIndex
     */
    public void setFirstIndex(int firstIndex){
        this.firstIndex = firstIndex;
    }

    /**
     * 留덉?留됲럹?댁? ?몃뜳?ㅻ? 媛?몄삩??
     * @return int 留덉?留됲럹?댁? ?몃뜳??
     */
    public int getLastIndex(){
        return lastIndex;
    }

    /**
     * 留덉?留됲럹?댁? ?몃뜳?ㅻ? ??ν븳??
     * @param lastIndex
     */
    public void setLastIndex(int lastIndex){
        this.lastIndex = lastIndex;
    }

    /**
     * ?꾩옱?섏씠吏瑜?媛?몄삩??
     * @return int ?꾩옱?섏씠吏
     */
    public int getPageIndex(){
        return pageIndex;
    }

    /**
     * ?꾩옱?섏씠吏瑜???ν븳??
     * @param pageIndex
     */
    public void setPageIndex(int pageIndex){
        this.pageIndex = pageIndex;
    }

    /**
     * ?섏씠吏 ?ъ씠利덈? 媛?몄삩??
     * @return int ?섏씠吏 ?ъ씠利?
     */
    public int getPageSize(){
        return pageSize;
    }

    /**
     * ?섏씠吏 ?ъ씠利덈? ??ν븳??
     * @param pageSize
     */
    public void setPageSize(int pageSize){
        this.pageSize = pageSize;
    }

    /**
     * ?섏씠吏 媛쒖닔瑜?媛?몄삩??
     * @return int ?섏씠吏 媛쒖닔
     */
    public int getPageUnit(){
        return pageUnit;
    }

    /**
     * ?섏씠吏 媛쒖닔瑜???ν븳??
     * @param pageUnit
     */
    public void setPageUnit(int pageUnit){
        this.pageUnit = pageUnit;
    }

    /**
     * ?섏씠吏???덉퐫??媛쒖닔瑜?媛?몄삩??
     * @return int ?섏씠吏???덉퐫??媛쒖닔
     */
    public int getRecordCountPerPage(){
        return recordCountPerPage;
    }

    /**
     * ?섏씠吏???덉퐫??媛쒖닔瑜???ν븳??
     * @param recordCountPerPage
     */
    public void setRecordCountPerPage(int recordCountPerPage){
        this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * 寃?됱“嫄댁쓣 媛?몄삩??
     * @return String 寃?됱“嫄?
     */
    public String getSearchCondition(){
        return searchCondition;
    }

    /**
     * 寃?됱“嫄댁쓣 ??ν븳??
     * @param searchCondition
     */
    public void setSearchCondition(String searchCondition){
        this.searchCondition = searchCondition;
    }

    /**
     * 寃?됰떒?대? 媛?몄삩??
     * @return String 寃?됰떒??
     */
    public String getSearchKeyword(){
        return searchKeyword;
    }

    /**
     * 寃?됰떒?대? ??ν븳??
     * @param searchKeyword
     */
    public void setSearchKeyword(String searchKeyword){
        this.searchKeyword = searchKeyword;
    }

    /**
     * 寃?됱궗?⑹뿬遺瑜?媛?몄삩??
     * @return String 寃?됱궗?⑹뿬遺
     */
    public String getSearchUseYn(){
        return searchUseYn;
    }

    /**
     * 寃?됱궗?⑹뿬遺瑜???ν븳??
     * @param searchUseYn
     */
    public void setSearchUseYn(String searchUseYn){
        this.searchUseYn = searchUseYn;
    }
    
}
