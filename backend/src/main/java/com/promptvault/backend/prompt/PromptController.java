package com.promptvault.backend.prompt;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/prompts")
public class PromptController {
  private final PromptService service;

  public PromptController(PromptService service) {
    this.service = service;
  }

  @GetMapping
  public List<PromptResponse> findAll() {
    return service.findAll();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("isAuthenticated()")
  public PromptResponse create(@RequestBody @Valid PromptRequest request, Authentication authentication) {
    boolean isAdmin = isAdmin(authentication);
    String author = resolveUserEmail(authentication);
    return service.create(request, isAdmin, author);
  }

  @PutMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public PromptResponse update(@PathVariable String id, @RequestBody @Valid PromptRequest request, Authentication authentication) {
    return service.update(id, request, resolveUserEmail(authentication), isAdmin(authentication));
  }

  @PostMapping("/{id}/copy")
  @PreAuthorize("isAuthenticated()")
  public PromptResponse incrementCopy(@PathVariable String id) {
    return service.incrementCopy(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("isAuthenticated()")
  public void delete(@PathVariable String id, Authentication authentication) {
    service.delete(id, resolveUserEmail(authentication), isAdmin(authentication));
  }

  private boolean isAdmin(Authentication authentication) {
    return authentication != null
        && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
  }

  private String resolveUserEmail(Authentication authentication) {
    if (authentication instanceof JwtAuthenticationToken jwtToken) {
      String email = jwtToken.getToken().getClaimAsString("email");
      if (email != null && !email.isBlank()) {
        return email;
      }
    }
    return authentication == null ? null : authentication.getName();
  }
}
