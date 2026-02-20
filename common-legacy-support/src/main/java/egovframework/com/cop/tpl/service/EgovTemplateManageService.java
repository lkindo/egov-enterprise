package egovframework.com.cop.tpl.service;

import java.util.List;
import java.util.Map;

/**
 * ??????? ? ??????????????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????             ????          ????
 *  ----------   --------   ---------------------------
 *  2009.05.17   ????          ????
 *  2019.05.17   ???          selectTemplateWhiteList() ??
 *
 *      </pre>
 **/
public interface EgovTemplateManageService {

    /**
     * ????????????.
     * 
     * @param tmplatInf
     * @throws Exception
     **/
    public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ??????????.
     * 
     * @param tmplatInf
     * @throws Exception
     **/
    public void insertTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ???????????.
     * 
     * @param tmplatInf
     * @throws Exception
     **/
    public void updateTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ???????????? ?????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public List<TemplateInfVO> selectTemplateWhiteList() throws Exception;

    /**
     * ????????????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public Map<String, Object> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ???????????????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ?????????? ??????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public TemplateInfVO selectTemplatePreview(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ???????? ?????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ?????????? ?????.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     **/
    public int selectTemplateInfsCnt(TemplateInfVO tmplatInfVO) throws Exception;
}
