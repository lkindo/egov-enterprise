package egovframework.com.utl.fcc.service;

import java.io.Serializable;

/**
 * @Class Name : EgovFormBasedFileVo.java
 * @Description : Form-based File Upload VO
 * @Modification Information
 * 
 *               ????????????
 *               ------- -------- ---------------------------
 *               2009.08.26 ????????
 *
 * @author ???? ?? ????
 * @since 2009.08.26
 * @version 1.0
 * @see
 * 
 *      Copyright (C) 2008 by MOPAS All rights reserved.
 **/
public class EgovFormBasedFileVo implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ????**/
    private String fileName = "";
    /** ContextType **/
    private String contentType = "";
    /** ?? ?? ??**/
    private String serverSubPath = "";
    /** ????????**/
    private String physicalName = "";
    /** ??? ????**/
    private long size = 0L;

    /**
     * fileName attribute?????.
     * 
     * @return the fileName
     **/
    public String getFileName() {
        return fileName;
    }

    /**
     * fileName attribute ???????.
     * 
     * @param fileName the fileName to set
     **/
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    /**
     * contentType attribute?????.
     * 
     * @return the contentType
     **/
    public String getContentType() {
        return contentType;
    }

    /**
     * contentType attribute ???????.
     * 
     * @param contentType the contentType to set
     **/
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    /**
     * serverSubPath attribute?????.
     * 
     * @return the serverSubPath
     **/
    public String getServerSubPath() {
        return serverSubPath;
    }

    /**
     * serverSubPath attribute ???????.
     * 
     * @param serverSubPath the serverSubPath to set
     **/
    public void setServerSubPath(String serverSubPath) {
        this.serverSubPath = serverSubPath;
    }

    /**
     * physicalName attribute?????.
     * 
     * @return the physicalName
     **/
    public String getPhysicalName() {
        return physicalName;
    }

    /**
     * physicalName attribute ???????.
     * 
     * @param physicalName the physicalName to set
     **/
    public void setPhysicalName(String physicalName) {
        this.physicalName = physicalName;
    }

    /**
     * size attribute?????.
     * 
     * @return the size
     **/
    public long getSize() {
        return size;
    }

    /**
     * size attribute ???????.
     * 
     * @param size the size to set
     **/
    public void setSize(long size) {
        this.size = size;
    }
}
