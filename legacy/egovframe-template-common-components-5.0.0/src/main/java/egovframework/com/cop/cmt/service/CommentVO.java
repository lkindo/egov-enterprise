package egovframework.com.cop.cmt.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?볤?愿由??쒕퉬?ㅻ? ?꾪븳 VO ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.29  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class CommentVO extends Comment {
    /** ?뺣젹?쒖꽌(DESC,ASC) */
    private long sortOrdr = 0L;

    /** ?꾩옱?섏씠吏 */
    private int subPageIndex = 1;

    /** ?섏씠吏媛쒖닔 */
    private int subPageUnit = 5;

    /** ?섏씠吏?ъ씠利?*/
    private int subPageSize = 5;

    /** 泥ロ럹?댁? ?몃뜳??*/
    private int subFirstIndex = 1;

    /** 留덉?留됲럹?댁? ?몃뜳??*/
    private int subLastIndex = 1;

    /** ?섏씠吏???덉퐫??媛쒖닔 */
    private int subRecordCountPerPage = 5;

    /** ?덉퐫??踰덊샇 */
    private int subRowNo = 0;
    
    /** ?몄텧 TYPE (head or body)*/
    private String type = "";
    
    /** ?섏젙 泥섎━ ?щ? */
    private boolean isModified = false;
    
    /**
     * sortOrdr attribute瑜?由ы꽩?쒕떎.
     * @return the sortOrdr
     */
    public long getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param sortOrdr the sortOrdr to set
     */
    public void setSortOrdr(long sortOrdr) {
        this.sortOrdr = sortOrdr;
    }

    /**
     * subPageIndex attribute瑜?由ы꽩?쒕떎.
     * @return the subPageIndex
     */
    public int getSubPageIndex() {
        return subPageIndex;
    }

    /**
     * subPageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subPageIndex the subPageIndex to set
     */
    public void setSubPageIndex(int subPageIndex) {
        this.subPageIndex = subPageIndex;
    }

    /**
     * subPageUnit attribute瑜?由ы꽩?쒕떎.
     * @return the subPageUnit
     */
    public int getSubPageUnit() {
        return subPageUnit;
    }

    /**
     * subPageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subPageUnit the subPageUnit to set
     */
    public void setSubPageUnit(int subPageUnit) {
        this.subPageUnit = subPageUnit;
    }

    /**
     * subPageSize attribute瑜?由ы꽩?쒕떎.
     * @return the subPageSize
     */
    public int getSubPageSize() {
        return subPageSize;
    }

    /**
     * subPageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subPageSize the subPageSize to set
     */
    public void setSubPageSize(int subPageSize) {
        this.subPageSize = subPageSize;
    }

    /**
     * subFirstIndex attribute瑜?由ы꽩?쒕떎.
     * @return the subFirstIndex
     */
    public int getSubFirstIndex() {
        return subFirstIndex;
    }

    /**
     * subFirstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subFirstIndex the subFirstIndex to set
     */
    public void setSubFirstIndex(int subFirstIndex) {
        this.subFirstIndex = subFirstIndex;
    }

    /**
     * subLastIndex attribute瑜?由ы꽩?쒕떎.
     * @return the subLastIndex
     */
    public int getSubLastIndex() {
        return subLastIndex;
    }

    /**
     * subLastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subLastIndex the subLastIndex to set
     */
    public void setSubLastIndex(int subLastIndex) {
        this.subLastIndex = subLastIndex;
    }

    /**
     * subRecordCountPerPage attribute瑜?由ы꽩?쒕떎.
     * @return the subRecordCountPerPage
     */
    public int getSubRecordCountPerPage() {
        return subRecordCountPerPage;
    }

    /**
     * subRecordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subRecordCountPerPage the subRecordCountPerPage to set
     */
    public void setSubRecordCountPerPage(int subRecordCountPerPage) {
        this.subRecordCountPerPage = subRecordCountPerPage;
    }

    /**
     * subRowNo attribute瑜?由ы꽩?쒕떎.
     * @return the subRowNo
     */
    public int getSubRowNo() {
        return subRowNo;
    }

    /**
     * subRowNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param subRowNo the subRowNo to set
     */
    public void setSubRowNo(int subRowNo) {
        this.subRowNo = subRowNo;
    }

    /**
     * type attribute瑜?由ы꽩?쒕떎.
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * type attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * isModified attribute瑜?由ы꽩?쒕떎.
     * @return the isModified
     */
    public boolean isModified() {
        return isModified;
    }

    /**
     * isModified attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param isModified the isModified to set
     */
    public void setModified(boolean isModified) {
        this.isModified = isModified;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
