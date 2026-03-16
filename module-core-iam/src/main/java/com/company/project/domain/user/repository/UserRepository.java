package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

@Repository("userRepository")
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);
    Optional<User> findBySubDn(String subDn);
    Optional<User> findByUserNmAndEmailAdres(String userNm, String emailAdres);
    Optional<User> findByUserIdAndUserNmAndEmailAdres(String userId, String userNm, String emailAdres);

    @Query("SELECT u FROM User u")
    List<User> findAllWithRole();

    @NonNull
    Optional<User> findById(@NonNull @Param("userId") String userId);

    List<User> findByUserNmContaining(String userNm);
    List<User> findByEmailAdresContaining(String emailAdres);
    List<User> findByOrgnztId(String orgnztId);
    List<User> findByRole(Role role);
    List<User> findByOrgnztIdAndRole(String orgnztId, Role role);
    List<User> findByUserNmContainingOrEmailAdresContaining(String userNm, String emailAdres);
}
