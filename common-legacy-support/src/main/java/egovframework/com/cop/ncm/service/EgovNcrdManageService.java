package egovframework.com.cop.ncm.service;

import java.util.Map;


/**
 * ??????? ??????????????
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.3.28  ????         ????
 *
 * </pre>
 **/
public interface EgovNcrdManageService {

    /**
     * ?????????.
     * 
     * @param nameCard
     * @throws Exception
     **/

	public void deleteNcrdItem(NameCardVO namecardVO) throws Exception;
    /**
     * ?? ????????????.
     * 
     * @param nameCard
     * @throws Exception
     **/
    public void insertNcrdItem(NameCard nameCard) throws Exception;

    /**
     * ???????????.
     * 
     * @param ncrdUser
     * @throws Exception
     **/
    public void insertNcrdUseInf(NameCardUser ncrdUser) throws Exception;

    /**
     * ???????????????.
     * 
     * @param nameCard
     * @return
     * @throws Exception
     **/
    public NameCardVO selectNcrdItem(NameCardVO ncrdVO) throws Exception;

    /**
     * ?????????????.
     * 
     * @param nameCard
     * @return
     * @throws Exception
     **/
    public Map<String, Object> selectNcrdItems(NameCardVO ncrdVO) throws Exception;

    /**
     * ?????????? ?????.
     * 
     * @param ncrdUser
     * @return
     * @throws Exception
     **/
    public Map<String, Object> selectNcrdUseInfs(NameCardUser ncrdUser) throws Exception;

    /**
     * ????????.
     * 
     * @param nameCard
     * @throws Exception
     **/
    public void updateNcrdItem(NameCard nameCard) throws Exception;

    /**
     * ????????????.
     * 
     * @param ncrdUser
     * @throws Exception
     **/
    public void updateNcrdUseInf(NameCardUser ncrdUser) throws Exception;

    /**
     * ???????????????.
     * 
     * @param ncrdVO
     * @return
     * @throws Exception
     **/
    public Map<String, Object> selectMyNcrdItems(NameCardVO ncrdVO) throws Exception;
    
}
