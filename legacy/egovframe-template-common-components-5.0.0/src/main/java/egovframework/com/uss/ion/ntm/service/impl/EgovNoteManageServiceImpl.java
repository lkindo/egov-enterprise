package egovframework.com.uss.ion.ntm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.ion.ntm.service.EgovNoteManageService;
import egovframework.com.uss.ion.ntm.service.NoteManageVO;
import jakarta.annotation.Resource;
/**
 * 履쎌? 愿由?蹂대궡湲?瑜?泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("egovNoteManageService")
public class EgovNoteManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovNoteManageService {

    @Resource(name = "noteManageDao")
    private NoteManageDao dao;

    /* 履쎌?愿由?ID Generator Service */
    @Resource(name = "egovNoteManageIdGnrService")
    private EgovIdGnrService noteIdgenService;

    /* 蹂대궦履쎌??④?由?ID Generator Service */
    @Resource(name = "egovNoteTrnsmitIdGnrService")
    private EgovIdGnrService noteTrnsmitIdgenService;

    /* 諛쏆?履쎌??④?由?ID Generator Service */
    @Resource(name = "egovNoteRecptnIdGnrService")
    private EgovIdGnrService noteRecptnIdgenService;

    /**
     * 履쎌?愿由??뺣낫瑜?議고쉶?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    @Override
	public Map<?, ?> selectNoteManage(NoteManageVO noteManage) throws Exception {
    	return dao.selectNoteManage(noteManage);
    }

    /**
     * 履쎌? 愿由?蹂대궡湲?瑜??? ?깅줉?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿릿 媛앹껜
     * @param commandMap -Request 蹂??
     * @throws Exception
     */
    @Override
	public void insertNoteManage(NoteManageVO noteManage, @RequestParam Map<?, ?> commandMap)throws Exception{

        /* ****************************************************************
         * 履쎌?愿由?泥섎━
         **************************************************************** */
    	//履쎌? ID?ㅼ젙
    	noteManage.setNoteId(noteIdgenService.getNextStringId());
    	//履쎌? ?깅줉
    	dao.insertNoteManage(noteManage);

        /* ****************************************************************
         * 蹂대궦履쎌? 泥섎━
         **************************************************************** */
    	//蹂대궦履쎌???ID?ㅼ젙
    	noteManage.setNoteTrnsmitId(noteTrnsmitIdgenService.getNextStringId());
    	//諛쒖떊???꾩씠?붿꽕??
    	noteManage.setTrnsmiterId(noteManage.getFrstRegisterId());

    	//蹂대궦履쎌??깅줉
    	dao.insertNoteTrnsmit(noteManage);

        //?섏떊??由ъ뒪??
        String sRecptnEmpList = (String)commandMap.get("recptnEmpList");
        String[] sRecptnEmpListResult = sRecptnEmpList.split(",");

        //?섏떊?먭뎄遺?由ъ뒪??
        String sRecptnSeList = (String)commandMap.get("recptnSeList");
        String[] sRecptnSeListResult = sRecptnSeList.split(",");


        /* ****************************************************************
         * 諛쏆?履쎌???泥섎━
         **************************************************************** */
        for(int i=0;i<sRecptnEmpListResult.length;i++){

        	//諛쏆?履쎌???ID?ㅼ젙
        	noteManage.setNoteRecptnId(noteRecptnIdgenService.getNextStringId());
        	//諛쏆?履쎌????섏떊?щ? ?ㅼ젙
        	noteManage.setOpenYn("N");
        	//諛쏆?履쎌????섏떊???ㅼ젙
        	noteManage.setRcverId(sRecptnEmpListResult[i]);
        	//諛쏆?履쎌????섏떊 援щ텇?ㅼ젙
        	noteManage.setRecptnSe(sRecptnSeListResult[i]);
        	//諛쏆?履쎌????깅줉
        	dao.insertNoteRecptn(noteManage);
        }


    }

    /**
	 * ?섏떊??李몄“?먯꽑?앺뙘??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List -?뚯썝?뺣낫 由ъ뒪??
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectNoteEmpListPopup(ComDefaultVO searchVO) throws Exception{
		return dao.selectNoteEmpListPopup(searchVO);
	}

    /**
	 *  ?섏떊??李몄“?먯꽑?앺뙘??媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int -議고쉶???곗씠??嫄댁닔
	 * @throws Exception
	 */
	@Override
	public int selectNoteEmpListPopupCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectNoteEmpListPopupCnt(searchVO);
	}
}
