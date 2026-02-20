package egovframework.com.cop.bbs.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ????????? ? VO ?????
 * 
 * @author ?????? ????
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.29  ????         ????
 *
 *      </pre>
 **/
public class SatisfactionVO extends Satisfaction {

    private static final long serialVersionUID = 1L;
    /** ???(DESC,ASC) **/
    private long sortOrdr = 0L;

    /** ??? **/
    private int subPageIndex = 1;

    /** ????**/
    private int subPageUnit = 10;

    /** ??????**/
    private int subPageSize = 10;

    /** ???? ???**/
    private int subFirstIndex = 1;

    /** ????? ???**/
    private int subLastIndex = 1;

    /** ??????????**/
    private int subRecordCountPerPage = 10;

    /** ??????**/
    private int subRowNo = 0;

    /** ? TYPE (head or body) **/
    private String type = "";

    /** ?? ????? **/
    private boolean isModified = false;

    /**
     * sortOrdr attribute?????.
     * 
     * @return the sortOrdr
     **/
    public long getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute ???????.
     * 
     * @param sortOrdr the sortOrdr to set
     **/
    public void setSortOrdr(long sortOrdr) {
        this.sortOrdr = sortOrdr;
    }

    /**
     * subPageIndex attribute?????.
     * 
     * @return the subPageIndex
     **/
    public int getSubPageIndex() {
        return subPageIndex;
    }

    /**
     * subPageIndex attribute ???????.
     * 
     * @param subPageIndex the subPageIndex to set
     **/
    public void setSubPageIndex(int subPageIndex) {
        this.subPageIndex = subPageIndex;
    }

    /**
     * subPageUnit attribute?????.
     * 
     * @return the subPageUnit
     **/
    public int getSubPageUnit() {
        return subPageUnit;
    }

    /**
     * subPageUnit attribute ???????.
     * 
     * @param subPageUnit the subPageUnit to set
     **/
    public void setSubPageUnit(int subPageUnit) {
        this.subPageUnit = subPageUnit;
    }

    /**
     * subPageSize attribute?????.
     * 
     * @return the subPageSize
     **/
    public int getSubPageSize() {
        return subPageSize;
    }

    /**
     * subPageSize attribute ???????.
     * 
     * @param subPageSize the subPageSize to set
     **/
    public void setSubPageSize(int subPageSize) {
        this.subPageSize = subPageSize;
    }

    /**
     * subFirstIndex attribute?????.
     * 
     * @return the subFirstIndex
     **/
    public int getSubFirstIndex() {
        return subFirstIndex;
    }

    /**
     * subFirstIndex attribute ???????.
     * 
     * @param subFirstIndex the subFirstIndex to set
     **/
    public void setSubFirstIndex(int subFirstIndex) {
        this.subFirstIndex = subFirstIndex;
    }

    /**
     * subLastIndex attribute?????.
     * 
     * @return the subLastIndex
     **/
    public int getSubLastIndex() {
        return subLastIndex;
    }

    /**
     * subLastIndex attribute ???????.
     * 
     * @param subLastIndex the subLastIndex to set
     **/
    public void setSubLastIndex(int subLastIndex) {
        this.subLastIndex = subLastIndex;
    }

    /**
     * subRecordCountPerPage attribute?????.
     * 
     * @return the subRecordCountPerPage
     **/
    public int getSubRecordCountPerPage() {
        return subRecordCountPerPage;
    }

    /**
     * subRecordCountPerPage attribute ???????.
     * 
     * @param subRecordCountPerPage the subRecordCountPerPage to set
     **/
    public void setSubRecordCountPerPage(int subRecordCountPerPage) {
        this.subRecordCountPerPage = subRecordCountPerPage;
    }

    /**
     * subRowNo attribute?????.
     * 
     * @return the subRowNo
     **/
    public int getSubRowNo() {
        return subRowNo;
    }

    /**
     * subRowNo attribute ???????.
     * 
     * @param subRowNo the subRowNo to set
     **/
    public void setSubRowNo(int subRowNo) {
        this.subRowNo = subRowNo;
    }

    /**
     * type attribute?????.
     * 
     * @return the type
     **/
    public String getType() {
        return type;
    }

    /**
     * type attribute ???????.
     * 
     * @param type the type to set
     **/
    public void setType(String type) {
        this.type = type;
    }

    /**
     * isModified attribute?????.
     * 
     * @return the isModified
     **/
    public boolean isModified() {
        return isModified;
    }

    /**
     * isModified attribute ???????.
     * 
     * @param isModified the isModified to set
     **/
    public void setModified(boolean isModified) {
        this.isModified = isModified;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
