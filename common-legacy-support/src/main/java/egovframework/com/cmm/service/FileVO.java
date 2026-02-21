package egovframework.com.cmm.service;

import egovframework.com.cmm.ComDefaultVO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @Class Name : FileVO.java
 * @Description : ???? ??? VO ?????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2009. 3. 25. ????
 *
 * @author ????????? ????
 * @since 2009. 3. 25.
 * @version
 * @see
 *
 **/
public class FileVO extends ComDefaultVO {

    private static final long serialVersionUID = 1L;

    /**
     * ???? ???
     **/
    public String atchFileId = "";
    /**
     * ????
     **/
    public String creatDt = "";
    /**
     * ?????
     **/
    public String fileCn = "";
    /**
     * ??????
     **/
    public String fileExtsn = "";
    /**
     * ??????
     **/
    public String fileMg = "";
    /**
     * ????
     **/
    public String fileSn = "";
    /**
     * ???????
     **/
    public String fileStreCours = "";
    /**
     * ???
     **/
    @NotBlank(message = "Required")
    @Size(max = 200, message = "Required")
    public String orignlFileNm = "";
    /**
     * ??????
     **/
    public String streFileNm = "";

    /**
     * atchFileId attribute?????.
     * 
     * @return the atchFileId
     **/
    public String getAtchFileId() {
        return atchFileId;
    }

    /**
     * atchFileId attribute ???????.
     * 
     * @param atchFileId
     *                   the atchFileId to set
     **/
    public void setAtchFileId(String atchFileId) {
        this.atchFileId = atchFileId;
    }

    /**
     * creatDt attribute?????.
     * 
     * @return the creatDt
     **/
    public String getCreatDt() {
        return creatDt;
    }

    /**
     * creatDt attribute ???????.
     * 
     * @param creatDt
     *                the creatDt to set
     **/
    public void setCreatDt(String creatDt) {
        this.creatDt = creatDt;
    }

    /**
     * fileCn attribute?????.
     * 
     * @return the fileCn
     **/
    public String getFileCn() {
        return fileCn;
    }

    /**
     * fileCn attribute ???????.
     * 
     * @param fileCn
     *               the fileCn to set
     **/
    public void setFileCn(String fileCn) {
        this.fileCn = fileCn;
    }

    /**
     * fileExtsn attribute?????.
     * 
     * @return the fileExtsn
     **/
    public String getFileExtsn() {
        return fileExtsn;
    }

    /**
     * fileExtsn attribute ???????.
     * 
     * @param fileExtsn
     *                  the fileExtsn to set
     **/
    public void setFileExtsn(String fileExtsn) {
        this.fileExtsn = fileExtsn;
    }

    /**
     * fileMg attribute?????.
     * 
     * @return the fileMg
     **/
    public String getFileMg() {
        return fileMg;
    }

    /**
     * fileMg attribute ???????.
     * 
     * @param fileMg
     *               the fileMg to set
     **/
    public void setFileMg(String fileMg) {
        this.fileMg = fileMg;
    }

    /**
     * fileSn attribute?????.
     * 
     * @return the fileSn
     **/
    public String getFileSn() {
        return fileSn;
    }

    /**
     * fileSn attribute ???????.
     * 
     * @param fileSn
     *               the fileSn to set
     **/
    public void setFileSn(String fileSn) {
        this.fileSn = fileSn;
    }

    /**
     * fileStreCours attribute?????.
     * 
     * @return the fileStreCours
     **/
    public String getFileStreCours() {
        return fileStreCours;
    }

    /**
     * fileStreCours attribute ???????.
     * 
     * @param fileStreCours
     *                      the fileStreCours to set
     **/
    public void setFileStreCours(String fileStreCours) {
        this.fileStreCours = fileStreCours;
    }

    /**
     * orignlFileNm attribute?????.
     * 
     * @return the orignlFileNm
     **/
    public String getOrignlFileNm() {
        return orignlFileNm;
    }

    /**
     * orignlFileNm attribute ???????.
     * 
     * @param orignlFileNm
     *                     the orignlFileNm to set
     **/
    public void setOrignlFileNm(String orignlFileNm) {
        this.orignlFileNm = orignlFileNm;
    }

    /**
     * streFileNm attribute?????.
     * 
     * @return the streFileNm
     **/
    public String getStreFileNm() {
        return streFileNm;
    }

    /**
     * streFileNm attribute ???????.
     * 
     * @param streFileNm
     *                   the streFileNm to set
     **/
    public void setStreFileNm(String streFileNm) {
        this.streFileNm = streFileNm;
    }

}
