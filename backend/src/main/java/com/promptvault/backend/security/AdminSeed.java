package com.promptvault.backend.security;

import java.util.Set;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminSeed {

  @Bean
  CommandLineRunner seedAdmin(UserRepository users, PasswordEncoder encoder) {
    return args -> {
      users
          .findByEmailIgnoreCase("admin@admin.com")
          .orElseGet(
              () -> {
                AppUser admin = new AppUser();
                admin.setEmail("admin@admin.com");
                admin.setPasswordHash(encoder.encode("admin"));
                admin.setRoles(Set.of(Role.ADMIN));
                admin.setActive(true);
                return users.save(admin);
              });
    };
  }
}

