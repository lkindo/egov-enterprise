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
 * 휴일에 대한 서비스 구현클래스를 정의한다
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.04.01  이중호          최초 생성
 *
 * </pre>
 */
import com.company.project.domain.calendar.RestdeRepository;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("RestdeManageService")
public class EgovCalRestdeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCalRestdeManageService {

    @Resource
    private RestdeRepository restdeRepository;

    @Resource(name="RestdeManageDAO")
    private RestdeManageDAO restdeManageDAO;

    /**
	 * 휴일을 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteRestde(Restde restde) throws Exception {
		restdeRepository.deleteById(restde.getRestdeNo());
	}

	/**
	 * 휴일을 등록한다.
	 */
	@Override
	@Transactional
	public void insertRestde(Restde restde) throws Exception {
        com.company.project.domain.calendar.Restde entity = com.company.project.domain.calendar.Restde.builder()
                .restdeDe(restde.getRestdeDe())
                .restdeNm(restde.getRestdeNm())
                .restdeDc(restde.getRestdeDc())
                .restdeSeCode(restde.getRestdeSeCode())
                .frstRegisterId(restde.getFrstRegisterId())
                .build();
    	restdeRepository.save(entity);
	}

	/**
	 * 휴일 상세항목을 조회한다.
	 */
	@Override
	public Restde selectRestdeDetail(Restde restde) throws Exception {
    	return restdeRepository.findById(restde.getRestdeNo())
                .map(entity -> {
                    Restde vo = new Restde();
                    vo.setRestdeNo(entity.getRestdeNo());
                    vo.setRestdeDe(entity.getRestdeDe());
                    vo.setRestdeNm(entity.getRestdeNm());
                    vo.setRestdeDc(entity.getRestdeDc());
                    vo.setRestdeSeCode(entity.getRestdeSeCode());
                    return vo;
                }).orElse(null);
	}

	/**
	 * 휴일 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectRestdeList(RestdeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage());
        
        Page<com.company.project.domain.calendar.Restde> page = restdeRepository.searchRestde(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        
        // Convert to EgovMap for legacy compatibility
        return page.getContent().stream().map(entity -> {
            EgovMap map = new EgovMap();
            map.put("restdeNo", entity.getRestdeNo());
            map.put("restdeDe", entity.getRestdeDe());
            map.put("restdeNm", entity.getRestdeNm());
            map.put("restdeDc", entity.getRestdeDc());
            map.put("restdeSeCode", entity.getRestdeSeCode());
            return map;
        }).collect(java.util.stream.Collectors.toList());
	}

	/**
	 * 휴일 총 개수를 조회한다.
	 */
	@Override
	public int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) restdeRepository.searchRestde(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
	}

	/**
	 * 휴일을 수정한다.
	 */
	@Override
	@Transactional
	public void updateRestde(Restde restde) throws Exception {
		restdeRepository.findById(restde.getRestdeNo()).ifPresent(entity -> {
            entity.update(restde.getRestdeDe(), restde.getRestdeNm(), 
                    restde.getRestdeDc(), restde.getRestdeSeCode(), restde.getLastUpdusrId());
        });
	}

}
