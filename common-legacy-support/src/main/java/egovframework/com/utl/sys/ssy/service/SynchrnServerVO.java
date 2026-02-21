package egovframework.com.utl.sys.ssy.service;

import java.io.File;
import java.util.Collections;
import java.util.List;

/**
 * ??
 * - ??????????????Vo ?????? ???.
 *
 * ???
 * - ??????????????? ?? ? ????
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:57
 **/

public class SynchrnServerVO extends SynchrnServer {

	private static final long serialVersionUID = 1L;

	/**
     * ???????????
     **/
    private String strSynchrnServerNm;

    /**
     * ???????? ?
     **/
    private List<SynchrnServerVO> synchrnServerList;

    /**
     * ???????????
     **/
    private File synchrnFile;

    /**
     * ???????????
     **/
    private String deleteFileNm;

    /**
     * ?????
     **/
    private String filePath;

    /**
     * ????
     **/
    private String strReflctAt;

    /**
     * @return the strSynchrnServerNm
     **/
    public String getStrSynchrnServerNm() {
        return strSynchrnServerNm;
    }

    /**
     * @param strSynchrnServerNm the strSynchrnServerNm to set
     **/
    public void setStrSynchrnServerNm(String strSynchrnServerNm) {
        this.strSynchrnServerNm = strSynchrnServerNm;
    }

    /**
     * @return the synchrnServerList
     **/
    public List<SynchrnServerVO> getSynchrnServerList() {
        return synchrnServerList;
    }

    /**
     * @param synchrnServerList the synchrnServerList to set
     **/
    public void setSynchrnServerList(List<SynchrnServerVO> synchrnServerList) {
        this.synchrnServerList = Collections.unmodifiableList(synchrnServerList);
    }

    /**
     * @return the synchrnFile
     **/
    public File getSynchrnFile() {
        return synchrnFile;
    }

    /**
     * @param synchrnFile the synchrnFile to set
     **/
    public void setSynchrnFile(File synchrnFile) {
        this.synchrnFile = synchrnFile;
    }

    /**
     * @return the deleteFileNm
     **/
    public String getDeleteFileNm() {
        return deleteFileNm;
    }

    /**
     * @param deleteFileNm the deleteFileNm to set
     **/
    public void setDeleteFileNm(String deleteFileNm) {
        this.deleteFileNm = deleteFileNm;
    }

    /**
     * @return the filePath
     **/
    public String getFilePath() {
        return filePath;
    }

    /**
     * @param filePath the filePath to set
     **/
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    /**
     * @return the strReflctAt
     **/
    public String getStrReflctAt() {
        return strReflctAt;
    }

    /**
     * @param strReflctAt the strReflctAt to set
     **/
    public void setStrReflctAt(String strReflctAt) {
        this.strReflctAt = strReflctAt;
    }

}
