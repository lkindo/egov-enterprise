package egovframework.com.utl.fcc.service;

import java.io.Serializable;

/**
 * @Class Name  : EgovFormBasedFileVo.java
 * @Description : Form-based File Upload VO
 * @Modification Information
 * 
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.08.26       ?쒖꽦怨?                 理쒖큹 ?앹꽦
 *
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.26
 * @version 1.0
 * @see 
 * 
 *  Copyright (C) 2008 by MOPAS  All rights reserved.
 */
@SuppressWarnings("serial")
public class EgovFormBasedFileVo implements Serializable {
    /** ?뚯씪紐?*/
    private String fileName = "";
    /** ContextType */
    private String contentType = "";
    /** ?섏쐞 ?붾젆?좊━ 吏??*/
    private String serverSubPath = "";
    /** 臾쇰━???뚯씪紐?*/
    private String physicalName = "";
    /** ?뚯씪 ?ъ씠利?*/
    private long size = 0L;
    
    /**
     * fileName attribute瑜?由ы꽩?쒕떎.
     * @return the fileName
     */
    public String getFileName() {
        return fileName;
    }
    /**
     * fileName attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param fileName the fileName to set
     */
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    /**
     * contentType attribute瑜?由ы꽩?쒕떎.
     * @return the contentType
     */
    public String getContentType() {
        return contentType;
    }
    /**
     * contentType attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param contentType the contentType to set
     */
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    /**
     * serverSubPath attribute瑜?由ы꽩?쒕떎.
     * @return the serverSubPath
     */
    public String getServerSubPath() {
        return serverSubPath;
    }
    /**
     * serverSubPath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param serverSubPath the serverSubPath to set
     */
    public void setServerSubPath(String serverSubPath) {
        this.serverSubPath = serverSubPath;
    }
    /**
     * physicalName attribute瑜?由ы꽩?쒕떎.
     * @return the physicalName
     */
    public String getPhysicalName() {
        return physicalName;
    }
    /**
     * physicalName attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param physicalName the physicalName to set
     */
    public void setPhysicalName(String physicalName) {
        this.physicalName = physicalName;
    }
    /**
     * size attribute瑜?由ы꽩?쒕떎.
     * @return the size
     */
    public long getSize() {
        return size;
    }
    /**
     * size attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param size the size to set
     */
    public void setSize(long size) {
        this.size = size;
    }
}
