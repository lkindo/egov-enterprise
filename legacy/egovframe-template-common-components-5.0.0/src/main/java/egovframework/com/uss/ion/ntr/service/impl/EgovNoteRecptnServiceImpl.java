package egovframework.com.uss.ion.ntr.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ntr.service.EgovNoteRecptnService;
import egovframework.com.uss.ion.ntr.service.NoteRecptn;
import jakarta.annotation.Resource;
/**
 * 諛쏆?履쎌??④?由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovNoteRecptnService")
public class EgovNoteRecptnServiceImpl extends EgovAbstractServiceImpl
        implements EgovNoteRecptnService {

    @Resource(name = "noteRecptnDao")
    private NoteRecptnDao dao;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovNoteRecptnServiceImpl.class);

    /**
     * 諛쏆?履쎌??④?由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param noteRecptn -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡?
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectNoteRecptnList(NoteRecptn noteRecptn) throws Exception {
    	return dao.selectNoteRecptnList(noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param noteRecptn -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒖쟾泥닿굔??
     * @throws Exception
     */
    @Override
	public int selectNoteRecptnListCnt(NoteRecptn noteRecptn) throws Exception {
        return dao.selectNoteRecptnListCnt(noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param noteRecptn -諛쏆?履쎌??④?由?Model
     * @return Map -?깆꽭議고쉶?뺣낫媛 ?닿릿 Map
     * @throws Exception
     */
    @Override
	public Map<?, ?> selectNoteRecptnDetail(NoteRecptn noteRecptn) throws Exception {
    	//諛쏆?履쎌??④?由щ? 媛쒕큺?쇰줈 ?곹깭瑜?諛붽씔??
    	dao.updateNoteRecptnRelationOpenYn(noteRecptn);
        return dao.selectNoteRecptnDetail(noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? ??젣?쒕떎.
     * @param noteRecptn 諛쏆?履쎌??④?由??뺣낫媛 ?닿릿 媛앹껜
     * @return void
     * @throws Exception
     */
    @Override
	public void deleteNoteRecptn(NoteRecptn noteRecptn) throws Exception {

        //蹂대궦履쎌???嫄댁닔瑜?議고쉶??
        int nNoteTrnsmitCnt = dao.selectNoteTrnsmitRelationCnt(noteRecptn);

        //諛쏆?履쎌???嫄댁닔瑜?議고쉶??
        int nNoteRecptnCnt = dao.selectNoteRecptnRelationCnt(noteRecptn);

        LOGGER.info("nNoteTrnsmitCnt>"+nNoteTrnsmitCnt);
        LOGGER.info("nNoteRecptnCnt>"+nNoteRecptnCnt);
        if(nNoteTrnsmitCnt == 1 && nNoteRecptnCnt==1){
        	//諛쏆?履쎌?/履쎌?愿由???젣 泥섎━
        	//dao.deleteNoteRecptnRelation(noteRecptn);
        	//諛쏆?履쎌??⑥궘??
        	dao.deleteNoteRecptn(noteRecptn);
        	//蹂대궦履쎌??⑥궘??
        	dao.deleteNoteTrnsmit(noteRecptn);
        	//履쎌?愿由ъ궘??
        	dao.deleteNoteManage(noteRecptn);
        }else{
        	//諛쏆?履쎌? ??젣
        	dao.deleteNoteRecptn(noteRecptn);
        }
    }

}
