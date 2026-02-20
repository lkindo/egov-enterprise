package egovframework.com.sym.cal.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.sym.cal.service.EgovCalRestdeManageService;
import egovframework.com.sym.cal.service.Restde;
import egovframework.com.sym.cal.service.RestdeVO;
import jakarta.annotation.Resource;

/**
 *
 * ?댁씪??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("RestdeManageService")
public class EgovCalRestdeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCalRestdeManageService {

    @Resource(name="RestdeManageDAO")
    private RestdeManageDAO restdeManageDAO;

	/**
	 * ?쇰컲?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectNormalRestdePopup(Restde restde) throws Exception {
		return restdeManageDAO.selectNormalRestdePopup(restde);
	}

	/**
	 * ?됱젙?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectAdministRestdePopup(Restde restde) throws Exception {
		return restdeManageDAO.selectAdministRestdePopup(restde);
	}

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectNormalDayCal(Restde restde) throws Exception {
		return restdeManageDAO.selectNormalDayCal(restde);
	}

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectNormalDayRestde(Restde restde) throws Exception {
		return restdeManageDAO.selectNormalDayRestde(restde);
	}

	/**
	 * ?쇰컲?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectNormalMonthRestde(Restde restde) throws Exception {
		return restdeManageDAO.selectNormalMonthRestde(restde);
	}

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectAdministDayCal(Restde restde) throws Exception {
		return restdeManageDAO.selectAdministDayCal(restde);
	}

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectAdministDayRestde(Restde restde) throws Exception {
		return restdeManageDAO.selectAdministDayRestde(restde);
	}

    /**
	 * ?됱젙?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 */
    @Override
	public List<EgovMap> selectAdministMonthRestde(Restde restde) throws Exception {
		return restdeManageDAO.selectAdministMonthRestde(restde);
	}

    /**
	 * ?댁씪????젣?쒕떎.
	 */
	@Override
	public void deleteRestde(Restde restde) throws Exception {
		restdeManageDAO.deleteRestde(restde);
	}

	/**
	 * ?댁씪???깅줉?쒕떎.
	 */
	@Override
	public void insertRestde(Restde restde) throws Exception {
    	restdeManageDAO.insertRestde(restde);
	}

	/**
	 * ?댁씪 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public Restde selectRestdeDetail(Restde restde) throws Exception {
    	Restde ret = restdeManageDAO.selectRestdeDetail(restde);
    	return ret;
	}

	/**
	 * ?댁씪 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectRestdeList(RestdeVO searchVO) throws Exception {
        return restdeManageDAO.selectRestdeList(searchVO);
	}

	/**
	 * ?댁씪 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception {
        return restdeManageDAO.selectRestdeListTotCnt(searchVO);
	}

	/**
	 * ?댁씪???섏젙?쒕떎.
	 */
	@Override
	public void updateRestde(Restde restde) throws Exception {
		restdeManageDAO.updateRestde(restde);
	}

}
