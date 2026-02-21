package egovframework.com.uss.ion.rsm.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.rsm.RecentSrchwrd;
import com.company.project.domain.rsm.RecentSrchwrdManage;
import com.company.project.domain.rsm.RecentSrchwrdManageRepository;
import com.company.project.domain.rsm.RecentSrchwrdRepository;

import egovframework.com.uss.ion.rsm.service.EgovRecentSrchwrdService;
import jakarta.annotation.Resource;

/**
 * ????????? ServiceImpl Class ?
 * Refactored to use JPA (RecentSrchwrdRepository,
 * RecentSrchwrdManageRepository)
 **/
@Service("egovRecentSrchwrdService")
@Transactional(readOnly = true)
public class EgovRecentSrchwrdServiceImpl extends EgovAbstractServiceImpl
                implements EgovRecentSrchwrdService {

        @Resource
        private RecentSrchwrdRepository recentSrchwrdRepository;

        @Resource
        private RecentSrchwrdManageRepository recentSrchwrdManageRepository;

        @Resource(name = "egovSrchwrdIdGnrService")
        private EgovIdGnrService egovSrchwrdIdGnrService;

        @Resource(name = "egovSrchwrdManageIdGnrService")
        private EgovIdGnrService egovSrchwrdManageIdGnrService;

        /**
         * ???????(?? ??????.
         **/
        @Override
        public List<EgovMap> selectRecentSrchwrdList(egovframework.com.uss.ion.rsm.service.RecentSrchwrd searchVO)
                        throws Exception {
                Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                                searchVO.getRecordCountPerPage());

                Page<RecentSrchwrdManage> page = recentSrchwrdManageRepository.findBySrchwrdManageNmContaining(
                                searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword(), pageable);

                return page.getContent().stream().map(this::toManageEgovMap).collect(Collectors.toList());
        }

        /**
         * ???????(?? ?? ???? ???.
         **/
        @Override
        public int selectRecentSrchwrdListCnt(egovframework.com.uss.ion.rsm.service.RecentSrchwrd searchVO)
                        throws Exception {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) recentSrchwrdManageRepository.findBySrchwrdManageNmContaining(
                                searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        /**
         * ???????(?? ?????.
         **/
        @Override
        public egovframework.com.uss.ion.rsm.service.RecentSrchwrd selectRecentSrchwrdDetail(
                        egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd) throws Exception {
                return recentSrchwrdManageRepository.findById(recentSrchwrd.getSrchwrdManageId())
                                .map(this::toManageVO)
                                .orElse(null);
        }

        /**
         * ???????(?? ???.
         **/
        @Override
        @Transactional
        public void insertRecentSrchwrd(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                String id = egovSrchwrdManageIdGnrService.getNextStringId();

                RecentSrchwrdManage entity = RecentSrchwrdManage.builder()
                                .srchwrdManageId(id)
                                .srchwrdManageNm(recentSrchwrd.getSrchwrdManageNm())
                                .srchwrdConectUrl(recentSrchwrd.getSrchwrdManageUrl())
                                .userSearchAt(recentSrchwrd.getSrchwrdManageUseYn())
                                .build();

                recentSrchwrdManageRepository.save(entity);
        }

        /**
         * ???????(?? ????.
         **/
        @Override
        @Transactional
        public void updateRecentSrchwrd(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                recentSrchwrdManageRepository.findById(recentSrchwrd.getSrchwrdManageId()).ifPresent(entity -> {
                        entity.update(
                                        recentSrchwrd.getSrchwrdManageNm(),
                                        recentSrchwrd.getSrchwrdManageUrl(),
                                        recentSrchwrd.getSrchwrdManageUseYn(),
                                        recentSrchwrd.getLastUpdusrId());
                });
        }

        /**
         * ???????(?? ?????.
         **/
        @Override
        @Transactional
        public void deleteRecentSrchwrd(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                recentSrchwrdManageRepository.deleteById(recentSrchwrd.getSrchwrdManageId());
        }

        /**
         * ???????? ??????.
         **/
        @Override
        public List<EgovMap> selectRecentSrchwrdResultInquire(
                        egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                // Simplified result inquiry
                return new ArrayList<>();
        }

        /**
         * ???????? ??????.
         **/
        @Override
        public List<?> selectRecentSrchwrdResultList(egovframework.com.uss.ion.rsm.service.RecentSrchwrd searchVO)
                        throws Exception {
                Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                                searchVO.getRecordCountPerPage());

                Page<RecentSrchwrd> page = recentSrchwrdRepository.findBySrchwrdNmContaining(
                                searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword(), pageable);

                return page.getContent().stream().map(this::toResultEgovMap).collect(Collectors.toList());
        }

        /**
         * ???????? ?? ???? ???.
         **/
        @Override
        public int selectRecentSrchwrdResultListCnt(egovframework.com.uss.ion.rsm.service.RecentSrchwrd searchVO)
                        throws Exception {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) recentSrchwrdRepository.findBySrchwrdNmContaining(
                                searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        /**
         * ???????? ???.
         **/
        @Override
        @Transactional
        public void insertRecentSrchwrdResult(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                String id = egovSrchwrdIdGnrService.getNextStringId();

                recentSrchwrdManageRepository.findById(recentSrchwrd.getSrchwrdManageId()).ifPresent(manage -> {
                        RecentSrchwrd entity = RecentSrchwrd.builder()
                                        .srchwrdId(id)
                                        .recentSrchwrdManage(manage)
                                        .srchwrdNm(recentSrchwrd.getSrchwrdNm())
                                        .build();
                        recentSrchwrdRepository.save(entity);
                });
        }

        /**
         * ???????? ?????????.
         **/
        @Override
        @Transactional
        public void deleteRecentSrchwrdResult(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                recentSrchwrdRepository.deleteById(recentSrchwrd.getSrchwrdId());
        }

        /**
         * ???????? ?????????.
         **/
        @Override
        @Transactional
        public void deleteRecentSrchwrdResultAll(egovframework.com.uss.ion.rsm.service.RecentSrchwrd recentSrchwrd)
                        throws Exception {
                recentSrchwrdRepository.deleteBySrchwrdManageId(recentSrchwrd.getSrchwrdManageId());
        }

        private EgovMap toManageEgovMap(RecentSrchwrdManage entity) {
                EgovMap map = new EgovMap();
                map.put("srchwrdManageId", entity.getSrchwrdManageId());
                map.put("srchwrdManageNm", entity.getSrchwrdManageNm());
                map.put("srchwrdManageUrl", entity.getSrchwrdConectUrl());
                map.put("srchwrdManageUseYn", entity.getUserSearchAt());
                map.put("frstRegisterId", entity.getFrstRegisterId());
                map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
                return map;
        }

        private EgovMap toResultEgovMap(RecentSrchwrd entity) {
                EgovMap map = new EgovMap();
                map.put("srchwrdManageId", entity.getSrchwrdManageId());
                map.put("srchwrdId", entity.getSrchwrdId());
                map.put("srchwrdNm", entity.getSrchwrdNm());
                map.put("frstRegisterId", entity.getFrstRegisterId());
                map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
                return map;
        }

        private egovframework.com.uss.ion.rsm.service.RecentSrchwrd toManageVO(RecentSrchwrdManage entity) {
                egovframework.com.uss.ion.rsm.service.RecentSrchwrd vo = new egovframework.com.uss.ion.rsm.service.RecentSrchwrd();
                vo.setSrchwrdManageId(entity.getSrchwrdManageId());
                vo.setSrchwrdManageNm(entity.getSrchwrdManageNm());
                vo.setSrchwrdManageUrl(entity.getSrchwrdConectUrl());
                vo.setSrchwrdManageUseYn(entity.getUserSearchAt());
                vo.setFrstRegisterId(entity.getFrstRegisterId());
                return vo;
        }

}
