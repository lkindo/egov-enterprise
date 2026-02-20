package egovframework.com.cop.ncm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.ncm.service.EgovNcrdManageService;
import egovframework.com.cop.ncm.service.NameCard;
import egovframework.com.cop.ncm.service.NameCardUser;
import egovframework.com.cop.ncm.service.NameCardVO;
import jakarta.annotation.Resource;

/**
 * 紐낇븿?뺣낫瑜?愿由ы븯湲??꾪븳 ?쒕퉬??援ы쁽  ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.3.28  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovNcrdManageService")
public class EgovNcrdManageServiceImpl extends EgovAbstractServiceImpl implements EgovNcrdManageService {

    @Resource(name = "NcrdManageDAO")
    private NcrdManageDAO ncrdMngDAO;

    @Resource(name = "egovNcrdIdGnrService")
    private EgovIdGnrService idgenService;

    //Logger log = Logger.getLogger(this.getClass());

    /**
     * 紐낇븿 ?뺣낫瑜???젣?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#deleteNcrdItem(egovframework.com.cop.ncm.num.service.NameCard)
     */


    @Override
	public void deleteNcrdItem(NameCardVO nameCardVO) throws Exception {

    	ncrdMngDAO.deleteNcrdItemUser(nameCardVO);
    	ncrdMngDAO.deleteNcrdItem(nameCardVO);

    }

    /**
     * 紐낇븿 ?뺣낫 諛?紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#insertNcrdItem(egovframework.com.cop.ncm.num.service.NameCard)
     */
    @Override
	public void insertNcrdItem(NameCard nameCard) throws Exception {
	nameCard.setTelNo(nameCard.getNationNo() + nameCard.getAreaNo() + nameCard.getMiddleTelNo() + nameCard.getEndTelNo());
	nameCard.setMbtlNum(nameCard.getIdntfcNo() + nameCard.getMiddleMbtlNum() + nameCard.getEndMbtlNum());

	nameCard.setNcrdId(idgenService.getNextStringId());

	NameCardUser ncrdUser = new NameCardUser();

	ncrdUser.setNcrdId(nameCard.getNcrdId());
	ncrdUser.setEmplyrId(nameCard.getFrstRegisterId());
	ncrdUser.setRegistSeCode("REGC04");
	ncrdUser.setUseAt("Y");

	ncrdMngDAO.insertNcrdItem(nameCard);
	ncrdMngDAO.insertNcrdUseInf(ncrdUser);
    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#insertNcrdUseInf(egovframework.com.cop.ncm.num.service.NameCardUser)
     */
    @Override
	public void insertNcrdUseInf(NameCardUser ncrdUser) throws Exception {
	ncrdUser.setRegistSeCode("REGC04");

	ncrdMngDAO.insertNcrdUseInf(ncrdUser);
    }

    /**
     * 紐낇븿 ?뺣낫??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#selectNcrdItem(egovframework.com.cop.ncm.num.service.NameCard)
     */
    @Override
	public NameCardVO selectNcrdItem(NameCardVO ncrdVO) throws Exception {
	return ncrdMngDAO.selectNcrdItem(ncrdVO);
    }

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#selectNcrdItems(egovframework.com.cop.ncm.num.service.NameCard)
     */
    @Override
	public Map<String, Object> selectNcrdItems(NameCardVO ncrdVO) throws Exception {
	List<NameCardVO> result = ncrdMngDAO.selectNcrdItemList(ncrdVO);
	int cnt = ncrdMngDAO.selectNcrdItemListCnt(ncrdVO);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#selectNcrdUseInf(egovframework.com.cop.ncm.num.service.NameCardUser)
     */
    @Override
	public Map<String, Object> selectNcrdUseInfs(NameCardUser ncrdUser) throws Exception {
	List<NameCardUser> result = ncrdMngDAO.selectNcrdUseInfs(ncrdUser);
	int cnt = ncrdMngDAO.selectNcrdUseInfsCnt(ncrdUser);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

    /**
     * 紐낇븿 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#updateNcrdItem(egovframework.com.cop.ncm.num.service.NameCard)
     */
    @Override
	public void updateNcrdItem(NameCard nameCard) throws Exception {
	nameCard.setTelNo(nameCard.getNationNo() + nameCard.getAreaNo() + nameCard.getMiddleTelNo() + nameCard.getEndTelNo());
	nameCard.setMbtlNum(nameCard.getIdntfcNo() + nameCard.getMiddleMbtlNum() + nameCard.getEndMbtlNum());

	ncrdMngDAO.updateNcrdItem(nameCard);

    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??섏젙?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#updateNcrdUseInf(egovframework.com.cop.ncm.num.service.NameCardUser)
     */
    @Override
	public void updateNcrdUseInf(NameCardUser ncrdUser) throws Exception {
	ncrdMngDAO.updateNcrdUseInf(ncrdUser);
    }

    /**
     * ??紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @see egovframework.com.cop.ncm.num.service.EgovNcrdManageService#selectMyNcrdItems(egovframework.com.cop.ncm.num.service.NameCard)
     */
    @Override
	public Map<String, Object> selectMyNcrdItems(NameCardVO ncrdVO) throws Exception {
	List<NameCardVO> result = ncrdMngDAO.selectMyNcrdItemList(ncrdVO);
	int cnt = ncrdMngDAO.selectMyNcrdItemListCnt(ncrdVO);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

}
