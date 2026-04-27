package com.promptvault.backend.admin;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminSecretGuard {
  private final String adminSecret;

  public AdminSecretGuard(@Value("${app.admin.secret:}") String adminSecret) {
    this.adminSecret = adminSecret == null ? "" : adminSecret.trim();
  }

  public void assertValid(String providedSecret) {
    String provided = providedSecret == null ? "" : providedSecret.trim();
    if (adminSecret.isBlank()) {
      throw new IllegalStateException("Admin secret nao configurado");
    }
    if (!adminSecret.equals(provided)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissao");
    }
  }
}

