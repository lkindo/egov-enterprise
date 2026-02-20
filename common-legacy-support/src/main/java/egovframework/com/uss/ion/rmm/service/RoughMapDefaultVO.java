package egovframework.com.uss.ion.rmm.service;

import java.io.Serializable;

/**
 * ??
 * - ???? ????VO ?????? ???.
 * 
 * ???
 * - ??? ??? ??????????
 *  
 * @author ???
 * @since 2014.08.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????		????	????
 *  -----------		------		---------
 *   2014.08.27		???	????
 *
 * </pre>
 **/

public class RoughMapDefaultVO implements Serializable {

	private static final long serialVersionUID = 1L;

	/** ???? ???**/
    private int firstIndex = 1;
    
    /** * ????? ???**/
    private int lastIndex = 1;
    
    /** ??? **/
    private int pageIndex = 1;
    
    /** ?? ????**/
    private int pageSize = 10;
    
    /** ?? ??**/
    private int pageUnit = 10;
    
    /** ??????????**/
    private int recordCountPerPage = 10;
    
    /** ???**/
    private String searchCondition = "";
    
    /** ????**/
    private String searchKeyword = "";
    
    /** ????? **/
    private String searchUseYn = "";

    /**
     * ???? ???? ???
     * @return int ???? ???
     **/
    public int getFirstIndex(){
        return firstIndex;
    }

    /**
     * ???? ???? ?????
     * @param firstIndex
     **/
    public void setFirstIndex(int firstIndex){
        this.firstIndex = firstIndex;
    }

    /**
     * ????? ???? ???
     * @return int ????? ???
     **/
    public int getLastIndex(){
        return lastIndex;
    }

    /**
     * ????? ???? ?????
     * @param lastIndex
     **/
    public void setLastIndex(int lastIndex){
        this.lastIndex = lastIndex;
    }

    /**
     * ????????
     * @return int ???
     **/
    public int getPageIndex(){
        return pageIndex;
    }

    /**
     * ??????????
     * @param pageIndex
     **/
    public void setPageIndex(int pageIndex){
        this.pageIndex = pageIndex;
    }

    /**
     * ?? ????? ???
     * @return int ?? ????
     **/
    public int getPageSize(){
        return pageSize;
    }

    /**
     * ?? ????? ?????
     * @param pageSize
     **/
    public void setPageSize(int pageSize){
        this.pageSize = pageSize;
    }

    /**
     * ?? ?????
     * @return int ?? ??
     **/
    public int getPageUnit(){
        return pageUnit;
    }

    /**
     * ?? ???????
     * @param pageUnit
     **/
    public void setPageUnit(int pageUnit){
        this.pageUnit = pageUnit;
    }

    /**
     * ?????????????
     * @return int ??????????
     **/
    public int getRecordCountPerPage(){
        return recordCountPerPage;
    }

    /**
     * ???????????????
     * @param recordCountPerPage
     **/
    public void setRecordCountPerPage(int recordCountPerPage){
        this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * ??? ???
     * @return String ???
     **/
    public String getSearchCondition(){
        return searchCondition;
    }

    /**
     * ??? ?????
     * @param searchCondition
     **/
    public void setSearchCondition(String searchCondition){
        this.searchCondition = searchCondition;
    }

    /**
     * ????? ???
     * @return String ????
     **/
    public String getSearchKeyword(){
        return searchKeyword;
    }

    /**
     * ????? ?????
     * @param searchKeyword
     **/
    public void setSearchKeyword(String searchKeyword){
        this.searchKeyword = searchKeyword;
    }

    /**
     * ??????????
     * @return String ?????
     **/
    public String getSearchUseYn(){
        return searchUseYn;
    }

    /**
     * ????????????
     * @param searchUseYn
     **/
    public void setSearchUseYn(String searchUseYn){
        this.searchUseYn = searchUseYn;
    }
    
}
