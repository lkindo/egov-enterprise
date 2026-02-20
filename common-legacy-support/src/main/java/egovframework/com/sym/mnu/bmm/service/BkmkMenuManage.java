package egovframework.com.sym.mnu.bmm.service;

import java.io.Serializable;

/**
 * ?????? ? ???????
 * 
 * @author ?????? ???
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.9.25  ???         ????
 *
 *      </pre>
 **/
public class BkmkMenuManage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** ?????**/
    String menuId = "";

    /** ??**/
    String menuNm = "";

    /** ??URL **/
    String progrmStrePath = "";

    /** ??????**/
    String userId = "";

    /**
     * menuId attribute?????.
     * 
     * @return the menuId
     **/
    public String getMenuId() {
        return menuId;
    }

    /**
     * menuId attribute ???????.
     * 
     * @param menuId
     *               the menuId to set
     **/
    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    /**
     * menuNm attribute?????.
     * 
     * @return the menuNm
     **/
    public String getMenuNm() {
        return menuNm;
    }

    /**
     * menuNm attribute ???????.
     * 
     * @param menuNm
     *               the menuNm to set
     **/
    public void setMenuNm(String menuNm) {
        this.menuNm = menuNm;
    }

    /**
     * progrmStrePath attribute?????.
     * 
     * @return the progrmStrePath
     **/
    public String getProgrmStrePath() {
        return progrmStrePath;
    }

    /**
     * progrmStrePath attribute ???????.
     * 
     * @param progrmStrePath
     *                       the progrmStrePath to set
     **/
    public void setProgrmStrePath(String progrmStrePath) {
        this.progrmStrePath = progrmStrePath;
    }

    /**
     * userId attribute?????.
     * 
     * @return the userId
     **/
    public String getUserId() {
        return userId;
    }

    /**
     * userId attribute ???????.
     * 
     * @param userId
     *               the userId to set
     **/
    public void setUserId(String userId) {
        this.userId = userId;
    }
}
