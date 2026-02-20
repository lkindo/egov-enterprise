package egovframework.com.cop.tpl.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.tpl.service.EgovTemplateManageService;
import egovframework.com.cop.tpl.service.TemplateInf;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import jakarta.annotation.Resource;

/**
 * ?쒗뵆由??뺣낫愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.03.17   ?댁궪??          理쒖큹 ?앹꽦
 *  2019.05.17   ?좎슜??          selectTemplateWhiteList() 異붽?
 *
 * </pre>
 */
@Service("EgovTemplateManageService")
public class EgovTemplateManageServiceImpl extends EgovAbstractServiceImpl implements EgovTemplateManageService {

    @Resource(name = "TemplateManageDAO")
    private TemplateManageDAO tmplatDAO;

    @Resource(name = "egovTmplatIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * ?쒗뵆由??뺣낫瑜???젣?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#deleteTemplateInf(egovframework.com.cop.bbs.com.service.TemplateInf)
     */
    @Override
	public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception {
	tmplatDAO.deleteTemplateInf(tmplatInf);
    }

    /**
     * ?쒗뵆由??뺣낫瑜??깅줉?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#insertTemplateInf(egovframework.com.cop.bbs.com.service.TemplateInf)
     */
    @Override
	public void insertTemplateInf(TemplateInf tmplatInf) throws Exception {

	tmplatInf.setTmplatId(idgenService.getNextStringId());

	tmplatDAO.insertTemplateInf(tmplatInf);
    }

    /**
     * ?쒗뵆由우뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#selectTemplateInf(egovframework.com.cop.bbs.com.service.TemplateInfVO)
     */
    @Override
	public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception {
	TemplateInfVO vo = new TemplateInfVO();
	vo = tmplatDAO.selectTemplateInf(tmplatInfVO);
	return vo;
    }

    /**
     * ?쒗뵆由우뿉 ????붿씠?몃━?ㅽ듃 紐⑸줉??議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#selectTemplateInfs(egovframework.com.cop.bbs.com.service.TemplateInfVO)
     */
    @Override
	public List<TemplateInfVO> selectTemplateWhiteList() throws Exception {
    	List<TemplateInfVO> resultWhiteList = tmplatDAO.selectTemplateWhiteList();

    	return resultWhiteList;
    }

    /**
     * ?쒗뵆由우뿉 ???紐⑸줉瑜?議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#selectTemplateInfs(egovframework.com.cop.bbs.com.service.TemplateInfVO)
     */
    @Override
	public Map<String, Object> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception {
	List<TemplateInfVO> result = tmplatDAO.selectTemplateInfs(tmplatInfVO);
	int cnt = tmplatDAO.selectTemplateInfsCnt(tmplatInfVO);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

    /**
     * ?쒗뵆由우뿉 ???誘몃━蹂닿린 ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#selectTemplatePreview(egovframework.com.cop.bbs.com.service.TemplateInfVO)
     */
    @Override
	public TemplateInfVO selectTemplatePreview(TemplateInfVO tmplatInfVO) throws Exception {
	TemplateInfVO vo = new TemplateInfVO();

	vo = tmplatDAO.selectTemplatePreview(tmplatInfVO);

	return vo;
    }

    /**
     * ?쒗뵆由??뺣낫瑜??섏젙?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#updateTemplateInf(egovframework.com.cop.bbs.com.service.TemplateInf)
     */
    @Override
	public void updateTemplateInf(TemplateInf tmplatInf) throws Exception {
	tmplatDAO.updateTemplateInf(tmplatInf);
    }

    /**
     * ?쒗뵆由?援щ텇???곕Ⅸ 紐⑸줉??議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.bbs.com.service.EgovTemplateManageService#selectAllTemplateInfs(egovframework.com.cop.bbs.com.service.TemplateInfVO)
     */
    @Override
	public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception {
	return tmplatDAO.selectTemplateInfsByCode(tmplatInfVO);
    }
}
