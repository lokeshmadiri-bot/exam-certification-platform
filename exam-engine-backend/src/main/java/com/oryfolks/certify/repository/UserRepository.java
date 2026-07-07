package com.oryfolks.certify.repository;

import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);

    List<User> findByRole(UserRole role);
}
