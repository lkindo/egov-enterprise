package egovframework.com.sym.ccm.acr.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptn;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptnVO;

/**
 *
 * 踰뺤젙?숈퐫?쒖뿉 ????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
 *   2009.04.01  ?댁쨷??        理쒖큹 ?앹꽦
 *   2024.10.29	 沅뚰깭??		踰뺤젙?숈퐫???????NullPointerException ?섏젙(insertAdministCode())
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */
@Repository("AdministCodeRecptnDAO")
public class AdministCodeRecptnDAO extends EgovComAbstractDAO {

	/**
	 * 踰뺤젙?숈퐫?쒖닔?좎쓣 泥섎━?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void insertAdministCodeRecptn(AdministCodeRecptn administCodeRecptn) throws Exception {
        insert("AdministCodeRecptnDAO.insertAdministCodeRecptn", administCodeRecptn);
	}

	/**
	 * 踰뺤젙?숈퐫?쒕? ?깅줉?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void insertAdministCode(AdministCodeRecptn administCodeRecptn) throws Exception {
		AdministCodeRecptn beforeData = (AdministCodeRecptn) selectOne("AdministCodeRecptnDAO.selectAdministCodeDetail", administCodeRecptn);

		if (beforeData != null
				&& beforeData.getAdministZoneCode().equals(administCodeRecptn.getAdministZoneCode())
				&& beforeData.getAdministZoneSe().equals(administCodeRecptn.getAdministZoneSe())
		) {
			// 湲곕벑濡??먮즺
			administCodeRecptn.setProcessSe("10");
		} else {
			int rtnValue = update("AdministCodeRecptnDAO.insertAdministCode", administCodeRecptn);
	        if (rtnValue != 1) {
	        	// ?깅줉 ?ㅻ쪟
	        	administCodeRecptn.setProcessSe("11");
	        }
        }
    	update("AdministCodeRecptnDAO.updateAdministCodeRecptn", administCodeRecptn);
	}

	/**
	 * 踰뺤젙?숈퐫?쒕? ?섏젙?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void updateAdministCode(AdministCodeRecptn administCodeRecptn) throws Exception {
		int rtnValue = update("AdministCodeRecptnDAO.updateAdministCode", administCodeRecptn);
        if (rtnValue != 1) {
        	// 蹂寃??ㅻ쪟
        	administCodeRecptn.setProcessSe("12");
        }
    	update("AdministCodeRecptnDAO.updateAdministCodeRecptn", administCodeRecptn);
	}

	/**
	 * 踰뺤젙?숈퐫?쒕? ??젣?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void deleteAdministCode(AdministCodeRecptn administCodeRecptn) throws Exception {
		int rtnValue = update("AdministCodeRecptnDAO.deleteAdministCode", administCodeRecptn);
        if (rtnValue != 1) {
        	// ??젣 ?ㅻ쪟
        	administCodeRecptn.setProcessSe("13");
        }
    	update("AdministCodeRecptnDAO.updateAdministCodeRecptn", administCodeRecptn);
	}

	/**
	 * 踰뺤젙?숈퐫???곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param administCode
	 * @return AdministCode(踰뺤젙?숈퐫??
	 */
	public AdministCodeRecptn selectAdministCodeDetail(AdministCodeRecptn administCodeRecptn) throws Exception {
		return (AdministCodeRecptn) selectOne("AdministCodeRecptnDAO.selectAdministCodeDetail", administCodeRecptn);
	}


    /**
	 * 踰뺤젙?숈퐫?쒖닔??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(踰뺤젙?숈퐫??紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectAdministCodeRecptnList(AdministCodeRecptnVO searchVO) throws Exception {
        return selectList("AdministCodeRecptnDAO.selectAdministCodeRecptnList", searchVO);
    }

    /**
	 * 踰뺤젙?숈퐫?쒖닔??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(踰뺤젙?숈퐫??珥?媛쒖닔)
     */
    public int selectAdministCodeRecptnListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
        return (Integer)selectOne("AdministCodeRecptnDAO.selectAdministCodeRecptnListTotCnt", searchVO);
    }

    /**
	 * 踰뺤젙?숈퐫??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(踰뺤젙?숈퐫??紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectAdministCodeList(AdministCodeRecptnVO searchVO) throws Exception {
        return selectList("AdministCodeRecptnDAO.selectAdministCodeList", searchVO);
    }

    /**
	 * 踰뺤젙?숈퐫??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(踰뺤젙?숈퐫??珥?媛쒖닔)
     */
    public int selectAdministCodeListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
        return (Integer)selectOne("AdministCodeRecptnDAO.selectAdministCodeListTotCnt", searchVO);
    }
}
