package egovframework.com.sym.mnu.bmm.service;

import java.io.Serializable;

/**
 * 諛붾줈媛湲곕찓?닿?由щ? ?꾪븳 紐⑤뜽 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.9.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class BkmkMenuManage implements Serializable{

    /** 硫붾돱 ?꾩씠??*/
    String menuId = "";
    
    /** 硫붾돱紐?*/
    String menuNm = "";
    
    /** 硫붾돱 URL */
    String progrmStrePath = "";
    
    /** ?깅줉???꾩씠??*/
    String userId = "";
    
    /**
     * menuId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the menuId
     */
    public String getMenuId() {
        return menuId;
    }    

    /**
     * menuId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param menuId
     *            the menuId to set
     */
    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }
    
    /**
     * menuNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the menuNm
     */
    public String getMenuNm() {
        return menuNm;
    }    

    /**
     * menuNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param menuNm
     *            the menuNm to set
     */
    public void setMenuNm(String menuNm) {
        this.menuNm = menuNm;
    }
    
    /**
     * progrmStrePath attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the progrmStrePath
     */
    public String getProgrmStrePath() {
        return progrmStrePath;
    }
    

    /**
     * progrmStrePath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param progrmStrePath
     *            the progrmStrePath to set
     */
    public void setProgrmStrePath(String progrmStrePath) {
        this.progrmStrePath = progrmStrePath;
    }
    
    /**
     * userId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userId
     */
    public String getUserId() {
        return userId;
    }    

    /**
     * userId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userId
     *            the userId to set
     */
    public void setUserId(String userId) {
        this.userId = userId;
    } 
}
