package com.promptvault.backend.security;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, String> {
  Optional<AppUser> findByEmailIgnoreCase(String email);

  List<AppUser> findAllByActiveTrueOrderByCreatedAtDesc();
}

